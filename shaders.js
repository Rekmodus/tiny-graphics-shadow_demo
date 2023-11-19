import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

import {Shape_From_File} from './examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'

export class Shadow_Fog_Textured_Phong_Shader extends Shadow_Textured_Phong_Shader {
    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform sampler2D light_depth_texture;
            uniform mat4 light_view_mat;
            uniform mat4 light_proj_mat;
            uniform float animation_time;
            uniform float light_depth_bias;
            uniform bool use_texture;
            uniform bool draw_shadow;
            uniform float light_texture_size;
            uniform float fog_start;
            uniform float fog_end;
            uniform float fog_density;
            uniform vec3 fog_color;
            

            float PCF_shadow(vec2 center, float projected_depth) {
                float shadow = 0.0;
                float texel_size = 1.0 / light_texture_size;
                for(int x = -1; x <= 1; ++x)
                {
                    for(int y = -1; y <= 1; ++y)
                    {
                        float light_depth_value = texture2D(light_depth_texture, center + vec2(x, y) * texel_size).r; 
                        shadow += projected_depth >= light_depth_value + light_depth_bias ? 1.0 : 0.0;        
                    }    
                }
                shadow /= 9.0;
                return shadow;
            }
            
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord );
                if (!use_texture)
                    tex_color = vec4(0, 0, 0, 1);
                if( tex_color.w < .01 ) discard;
                
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                
                // Compute the final color with contributions from lights:
                vec3 diffuse, specular;
                vec3 other_than_ambient = phong_model_lights( normalize( N ), vertex_worldspace, diffuse, specular );
                


                vec3 final_color = gl_FragColor.xyz;

                // Simulate fog based on distance from the camera:
                float fog_distance = length(vertex_worldspace - camera_center);

                float fog_factor = clamp((fog_distance - 5.0) / (40.0 - 5.0), 0.0, 1.0);

                // Use an exponential function for fog density
                fog_factor = 1.0 - exp(-fog_density * fog_distance);
            
                fog_factor = clamp(fog_factor, 0.0, 1.0);
                vec3 fog_color = vec3(0, 0, 0); // Adjust the fog color
                gl_FragColor.xyz = mix(final_color, fog_color, fog_factor);


                // Deal with shadow:
                if (draw_shadow) {
                    vec4 light_tex_coord = (light_proj_mat * light_view_mat * vec4(vertex_worldspace, 1.0));
                    // convert NDCS from light's POV to light depth texture coordinates
                    light_tex_coord.xyz /= light_tex_coord.w; 
                    light_tex_coord.xyz *= 0.5;
                    light_tex_coord.xyz += 0.5;
                    float light_depth_value = texture2D( light_depth_texture, light_tex_coord.xy ).r;
                    float projected_depth = light_tex_coord.z;
                    
                    bool inRange =
                        light_tex_coord.x >= 0.0 &&
                        light_tex_coord.x <= 1.0 &&
                        light_tex_coord.y >= 0.0 &&
                        light_tex_coord.y <= 1.0;

                    // Calculate distance from the center of the circular flashlight in screen space
                    // Slight hard coded animation wobble.. might remove it
                    vec2 light_screen_center = vec2(0.5 + 0.01*sin(animation_time * 0.009), 0.5 + 0.1*sin(animation_time * 0.009)); // Hardcoded value for testing
                    vec2 distance_from_center = abs(light_tex_coord.xy - light_screen_center);
                    float distance = length(distance_from_center);

                    // Modify this threshold as needed
                    float distance_threshold = 0.02;
                    float light_radius = 0.3;
                    

                    // Adjust shadow based on distance from the center
                    float circular_flashlight_attenuation = inRange ? smoothstep(light_radius, light_radius + distance_threshold, distance) : 1.0;
                
                    float shadowness = PCF_shadow(light_tex_coord.xy, projected_depth);
                
                    // Combine old shadows and circular flashlight effect
                    float combined_shadow = max(shadowness, circular_flashlight_attenuation);
                
                    diffuse *= 0.2 + 0.8 * (1.0 - combined_shadow);
                    specular *= 1.0 - combined_shadow;

                    ///////      
                    // float shadowness = PCF_shadow(light_tex_coord.xy, projected_depth);
                    
                    // if (inRange && shadowness > 0.3) {
                    //     diffuse *= 0.2 + 0.8 * (1.0 - shadowness);
                    //     specular *= 1.0 - shadowness;
                    // }
                }
                
                gl_FragColor.xyz += diffuse + specular;
            } `;
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.view_mat).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));
        // shadow related
        gl.uniformMatrix4fv(gpu.light_view_mat, false, Matrix.flatten_2D_to_1D(gpu_state.light_view_mat.transposed()));
        gl.uniformMatrix4fv(gpu.light_proj_mat, false, Matrix.flatten_2D_to_1D(gpu_state.light_proj_mat.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    //gl.uniform1f(gpu.diffusivity, material.diffusivity);
    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        // Updated for assignment 4
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
        context.uniform1f(gpu_addresses.fog_density, material.fog_density || 0.15);
        context.uniform1f(gpu_addresses.fog_color, material.fog_color || vec3(0, 0, 0)); // Adjust the fog color; // Adjust the fog color, material.fog_density || 0.15);
        if (material.color_texture && material.color_texture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i(gpu_addresses.color_texture, 0); // 0 for color texture
            // For this draw, use the texture image from correct the GPU buffer:
            context.activeTexture(context["TEXTURE" + 0]);
            material.color_texture.activate(context);
            context.uniform1i(gpu_addresses.use_texture, 1);
        }
        else {
            context.uniform1i(gpu_addresses.use_texture, 0);
        }
        if (gpu_state.draw_shadow) {
            context.uniform1i(gpu_addresses.draw_shadow, 1);
            context.uniform1f(gpu_addresses.light_depth_bias, 0.003);
            context.uniform1f(gpu_addresses.light_texture_size, LIGHT_DEPTH_TEX_SIZE);
            context.uniform1i(gpu_addresses.light_depth_texture, 1); // 1 for light-view depth texture}
            if (material.light_depth_texture && material.light_depth_texture.ready) {
                context.activeTexture(context["TEXTURE" + 1]);
                material.light_depth_texture.activate(context, 1);
            }
        }
        else {
            context.uniform1i(gpu_addresses.draw_shadow, 0);
        }
    }
}

export class Shadow_Scroll_Textured_Phong_Shader extends Shadow_Fog_Textured_Phong_Shader {

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform sampler2D light_depth_texture;
            uniform mat4 light_view_mat;
            uniform mat4 light_proj_mat;
            uniform float animation_time;
            uniform float light_depth_bias;
            uniform bool use_texture;
            uniform bool draw_shadow;
            uniform float light_texture_size;
            
            float PCF_shadow(vec2 center, float projected_depth) {
                float shadow = 0.0;
                float texel_size = 1.0 / light_texture_size;
                for(int x = -1; x <= 1; ++x)
                {
                    for(int y = -1; y <= 1; ++y)
                    {
                        float light_depth_value = texture2D(light_depth_texture, center + vec2(x, y) * texel_size).r; 
                        shadow += projected_depth >= light_depth_value + light_depth_bias ? 1.0 : 0.0;        
                    }    
                }
                shadow /= 9.0;
                return shadow;
            }
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 f_tex_2 = f_tex_coord;
                vec2 f_tex_3 = vec2(f_tex_2.s - 2.0 * animation_time, f_tex_2.t);

                vec4 tex_color = texture2D( texture, f_tex_3 );
                if (!use_texture)
                    tex_color = vec4(0, 0, 0, 1);
                if( tex_color.w < .01 ) discard;
                
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                
                // Compute the final color with contributions from lights:
                vec3 diffuse, specular;
                vec3 other_than_ambient = phong_model_lights( normalize( N ), vertex_worldspace, diffuse, specular );
                
                vec3 final_color = gl_FragColor.xyz;

                float fog_density = 0.15;

                // Simulate fog based on distance from the camera:
                float fog_distance = length(vertex_worldspace - camera_center);

                float fog_factor = clamp((fog_distance - 10.0) / (40.0 - 10.0), 0.0, 1.0);

                // Use an exponential function for fog density
                fog_factor = 1.0 - exp(-fog_density * fog_distance);
            
                fog_factor = clamp(fog_factor, 0.0, 1.0);
                vec3 fog_color = vec3(0, 0, 0); // Adjust the fog color
                gl_FragColor.xyz = mix(final_color, fog_color, fog_factor);
                
                // Deal with shadow:
                if (draw_shadow) {
                    vec4 light_tex_coord = (light_proj_mat * light_view_mat * vec4(vertex_worldspace, 1.0));
                    // convert NDCS from light's POV to light depth texture coordinates
                    light_tex_coord.xyz /= light_tex_coord.w; 
                    light_tex_coord.xyz *= 0.5;
                    light_tex_coord.xyz += 0.5;
                    float light_depth_value = texture2D( light_depth_texture, light_tex_coord.xy ).r;
                    float projected_depth = light_tex_coord.z;
                    
                    bool inRange =
                        light_tex_coord.x >= 0.0 &&
                        light_tex_coord.x <= 1.0 &&
                        light_tex_coord.y >= 0.0 &&
                        light_tex_coord.y <= 1.0;

                    // Calculate distance from the center of the circular flashlight in screen space
                    // Slight hard coded animation wobble.. might remove it
                    vec2 light_screen_center = vec2(0.5 + 0.01*sin(animation_time * 0.009), 0.5 + 0.1*sin(animation_time * 0.009)); // Hardcoded value for testing
                    vec2 distance_from_center = abs(light_tex_coord.xy - light_screen_center);
                    float distance = length(distance_from_center);

                    // Modify this threshold as needed
                    float distance_threshold = 0.02;
                    float light_radius = 0.3;

                    // Adjust shadow based on distance from the center
                    float circular_flashlight_attenuation = inRange ? smoothstep(light_radius, light_radius + distance_threshold, distance) : 1.0;
                
                    float shadowness = PCF_shadow(light_tex_coord.xy, projected_depth);
                
                    // Combine old shadows and circular flashlight effect
                    float combined_shadow = max(shadowness, circular_flashlight_attenuation);
                
                    diffuse *= 0.2 + 0.8 * (1.0 - combined_shadow);
                    specular *= 1.0 - combined_shadow;
                          
                    // float shadowness = PCF_shadow(light_tex_coord.xy, projected_depth);
                    
                    // if (inRange && shadowness > 0.3) {
                    //     diffuse *= 0.2 + 0.8 * (1.0 - shadowness);
                    //     specular *= 1.0 - shadowness;
                    // }
                }
                
                gl_FragColor.xyz += diffuse + specular;

                //vec3 final_color = gl_FragColor.xyz;

            } `;
    }
}