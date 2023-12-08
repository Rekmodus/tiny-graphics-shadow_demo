import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

import {Movement_Controls_2} from './first-person-controller.js' 

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

                // Scale the perturbation factor to increase the bump mapping effect
                float bump_strength = 1.0; // Adjust this value to control the strength
                vec3 bumped_N = N + bump_strength * (tex_color.rgb - 0.5 * vec3(1, 1, 1));
                // Slightly disturb normals based on sampling the same image that was used for texturing:
                //vec3 bumped_N  = N + tex_color.rgb - .5*vec3(1,1,1);
                
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                
                // Compute the final color with contributions from lights:
                vec3 diffuse, specular;
                vec3 other_than_ambient = phong_model_lights( normalize( bumped_N ), vertex_worldspace, diffuse, specular );
                


                vec3 final_color = gl_FragColor.xyz;

                float fog_density = 0.15;

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
                vec2 f_tex_3 = vec2(f_tex_2.s - 1.0 * animation_time, f_tex_2.t);

                vec4 tex_color = texture2D( texture, f_tex_3 );
                if (!use_texture)
                    tex_color = vec4(0, 0, 0, 1);
                if( tex_color.w < .01 ) discard;
                
                // Scale the perturbation factor to increase the bump mapping effect
                float bump_strength = 2.0; // Adjust this value to control the strength
                vec3 bumped_N = N + bump_strength * (tex_color.rgb - 0.5 * vec3(1, 1, 1));
                // Slightly disturb normals based on sampling the same image that was used for texturing:
                //vec3 bumped_N  = N + tex_color.rgb - .5*vec3(1,1,1);
                
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                
                // Compute the final color with contributions from lights:
                vec3 diffuse, specular;
                vec3 other_than_ambient = phong_model_lights( normalize( bumped_N ), vertex_worldspace, diffuse, specular );
                


                vec3 final_color = gl_FragColor.xyz;

                float fog_density = 0.15;

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
                    float light_radius = 0.2;

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
}