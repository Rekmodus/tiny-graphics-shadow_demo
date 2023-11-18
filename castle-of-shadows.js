import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

import {Movement_Controls_2} from './first-person-controller.js' 
import { Shadow_Fog_Textured_Phong_Shader, Shadow_Scroll_Textured_Phong_Shader } from './shaders.js';

import {Shape_From_File} from './examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'

// 2D shape, to display the texture buffer
const Square =
    class Square extends tiny.Vertex_Buffer {
        constructor() {
            super("position", "normal", "texture_coord");
            this.arrays.position = [
                vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0),
                vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
            ];
            this.arrays.normal = [
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            ];
            this.arrays.texture_coord = [
                vec(0, 0), vec(1, 0), vec(0, 1),
                vec(1, 1), vec(1, 0), vec(0, 1)
            ]
        }
    }


// The scene
export class Castle_of_shadows extends Simulation {
    constructor() {
        super();

        this.shapes = {
            "teapot": new Shape_From_File("assets/teapot.obj"),
            "blender_cube": new Shape_From_File("assets/blender_cube.obj"),
            "Flashlight": new Shape_From_File("assets/flash.obj"),
            "picture": new Shape_From_File("assets/Picture.obj"),
            "table": new Shape_From_File("assets/Small Dirty Table 01.obj"),
            "monster": new Shape_From_File("assets/monster.obj"),
            "sphere": new Subdivision_Sphere(6),
            "cube": new Cube(),
            "floor": new Cube(),
            "square_2d": new Square(),
        };
        this.shapes.floor.arrays.texture_coord.forEach(p => p.scale_by(2));


        let moon;
        let agent_body;
        let shadowView = false;
        let moving = false;
        this.timer_offset = 0;
        this.t = 0;

// Materials

        // For the teapot
        this.stars = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/stars.png"),
            light_depth_texture: null
        });

        // For the flashlight
        this.flash = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.0, .0, .0, 1),
            ambient: 1, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/flash.png"),
            light_depth_texture: null
        });
        // For the Picture2
        this.pic2 = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(1, 1, 1, 1),
            ambient: .4, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/rgb.jpg"),
            light_depth_texture: null
        });

        // For the Picture
        this.pic = new Material(new Shadow_Scroll_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: .4, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/sh.png"),
            light_depth_texture: null
        });

        // For the table
        this.wood = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: .4, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/texture01.png"),
            light_depth_texture: null
        });

        // For the monster
        this.mon = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: .4, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/full_low_body__BaseColor.png"),
            light_depth_texture: null
        });

        // For the floor or other plain objects
        this.floor = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/grid.png"),
            light_depth_texture: null
        })

        this.Wall = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/Wall.png"),
            light_depth_texture: null
        })

        // For the first pass
        this.pure = new Material(new Color_Phong_Shader(), {
        })
        // For light source
        this.light_src = new Material(new Phong_Shader(), {
            color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
        });
        // For depth texture display
        this.depth_tex =  new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, .0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });

        // To make sure texture initialization only does once
        this.init_ok = false;

        // The agent
        // this.agent = new defs.Subdivision_Sphere(4);
        this.agent = new Shape_From_File("assets/monster.obj");
        this.agent_pos = vec3(1.2, 1.9, 3.5);
        this.agent_size = 0.5;

        this.control = {};
        this.control.w = false;
        this.control.a = false;
        this.control.s = false;
        this.control.d = false;
        this.control.e = false;
        this.control.space = false;

        this.data = new Test_Data();

    }


    make_control_panel() {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Test control panel!!: ";
        // The next line adds a live text readout of a data member of our Scene.
        // this.live_string(box => {
        //     box.textContent = (this.hover ? 0 : (this.t % (2 * Math.PI)).toFixed(2)) + " radians"
        // });
        this.new_line();
        this.new_line();
        // Add buttons so the user can actively toggle data members of our Scene:
        this.key_triggered_button("Toggle_Light", ["f"], function () {
            this.hover ^= 1;
        });
        this.new_line();
        this.key_triggered_button("Bouncy", ["b"], function () {
            this.swarm ^= 1;
        });
        this.new_line();
        this.key_triggered_button("ShadowView", ["l"], function () {
            this.shadowView ^= 1;
        });
        this.new_line();
        this.key_triggered_button("Foward", ["Shift", "W"],
            () => this.control.w = true, '#6E6460', () => this.control.w = false);
        this.key_triggered_button("Back",   ["Shift", "S"],
            () => this.control.s = true, '#6E6460', () => this.control.s = false);
        this.key_triggered_button("Left",   ["Shift", "A"],
            () => this.control.a = true, '#6E6460', () => this.control.a = false);
        this.key_triggered_button("Right",  ["Shift", "D"],
            () => this.control.d = true, '#6E6460', () => this.control.d = false);
        this.key_triggered_button("Look_Right",  ["e"],
            () => this.control.e = true, '#6E6460', () => this.control.e = false);
        this.key_triggered_button("Speed Up",  [" "],
            () => this.control.space = true, '#6E6460', () => this.control.space = false);
            this.new_line();
            this.key_triggered_button("Attach to object", ["1"], () => this.attached = () => this.moon);

        }light_depth_texture

    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.stars.light_depth_texture = this.light_depth_texture
        this.floor.light_depth_texture = this.light_depth_texture
        this.flash.light_depth_texture = this.light_depth_texture
        this.pic2.light_depth_texture = this.light_depth_texture
        this.pic.light_depth_texture = this.light_depth_texture
        this.wood.light_depth_texture = this.light_depth_texture
        this.mon.light_depth_texture = this.light_depth_texture
        this.Wall.light_depth_texture = this.light_depth_texture


        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article why this is needed_
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        let light_position = this.light_position;
        let light_color = this.light_color;
        let t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        // if (draw_light_source && shadow_pass) {
        //     this.shapes.sphere.draw(context, program_state,
        //         Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(0.1,0.1,0.1)),
        //         this.light_src.override({color: light_color}));
        // }

        for (let i of [-1, 1]) { // Spin the 3D model shapes as well.
            const model_transform = Mat4.translation(2 * i, 3, 0)
                .times(Mat4.rotation(t / 1000, -1, 2, 0))
                .times(Mat4.rotation(-Math.PI / 2, 0, 1, 0));
            this.shapes.table.draw(context, program_state, model_transform, shadow_pass? this.wood : this.pure);
        }

        let model_trans_floor = Mat4.translation(0, 0, 0).times(Mat4.scale(8, 0.1, 5));
        let model_trans_ceil = Mat4.translation(0, 8, 0).times(Mat4.scale(8, 0.1, 5));
        let model_trans_ball_0 = Mat4.translation(0, 1, 0);
        let model_trans_ball_1 = Mat4.translation(5, 0.5, 0);
        let model_trans_ball_2 = Mat4.translation(-5, 1.8, 0).times(Mat4.scale(0.5, 0.5, 0.5));
        let model_trans_ball_3 = Mat4.translation(0, 1, 3);
        let model_trans_ball_4 = Mat4.translation(-5, 1, -3);

        let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 3, 5));
        let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 8));
        let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 5, 0.33));
      

        this.shapes.floor.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure);
        this.shapes.floor.draw(context, program_state, model_trans_ceil, shadow_pass? this.floor : this.pure);

        this.shapes.cube.draw(context, program_state, model_trans_wall_1, shadow_pass? this.Wall : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_2, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_3, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, Mat4.translation(0, 1, 0).times(Mat4.identity()), shadow_pass? this.floor : this.pure);

        //const planet_position = program_state.camera_transform.times(vec4(0, 0, 0, 1)); 

        //this.light_position = Mat4.translation(0,0,0).times(planet_position);
        //this.shapes.cube.draw(context, program_state, Mat4.translation(0,0,1).times(planet_position), shadow_pass? this.floor : this.pure);

        
        this.shapes.sphere.draw(context, program_state, model_trans_ball_0, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_1, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_2, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_3, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_4, shadow_pass? this.floor : this.pure);

        this.shapes.table.draw(context, program_state, model_trans_ball_1, shadow_pass? this.wood : this.pure);
        this.shapes.teapot.draw(context, program_state, model_trans_ball_2, shadow_pass? this.stars : this.pure);

            
        let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2]).
        times(Mat4.scale(this.agent_size,this.agent_size,this.agent_size));
        this.moon = agent_trans;
        // console.log("moon!!" + this.moon);
        //() => this.attached = () => this.agent_trans_;

        this.agent_body = new Body(this.agent.draw(context, program_state, agent_trans, shadow_pass? this.mon : this.pure));

    
        if (this.attached){
            if (this.attached() != null){
                //console.log(this.attached());
                //program_state.set_camera(this.attached().times(Mat4.translation(0,0,5)));     
                const planet_position = this.attached().times(vec4(0, 0, 0, 1)).to3(); // Get the position of the attached planet
                const eye = planet_position.plus(vec3(0, 5, 9)); // Set the camera position relative to the planet
                const target = planet_position; // Set the camera target to the planet's position
        
                let desired =  Mat4.look_at(eye, target, vec3(0, 1, 0))

                let blending_factor = 1.0;

                program_state.camera_inverse = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
            }
        }
 
        // For walking animation
        if (this.moving){
            
            this.t = t - this.timer_offset;
            //console.log("TIMER"+ this.t);
        }else{
            this.timer_offset = t 
            this.t = t;
        }
   
        let base_transform = Mat4.identity().times(Mat4.scale(0.5,0.5,0.5).times(Mat4.translation(2.5 + (0.01 + 0.05*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-1.5 + (0.1 + 0.05*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-5)));
        this.shapes.Flashlight.draw(context, program_state, program_state.camera_transform.times(base_transform), shadow_pass? this.flash : this.pure);
        
        let model_transform = Mat4.identity();
        this.shapes.picture.draw(context, program_state, Mat4.translation(-2,2,0).times(Mat4.rotation(t/1000, 1,0,0)).times(model_transform), this.pic2);
        this.shapes.picture.draw(context, program_state, model_trans_ball_4, this.pic);
    }

    display(context, program_state) {
        const t = program_state.animation_time;
        const gl = context.context;

        // display(): advance the time and state of our whole simulation.
        if (program_state.animate)
        this.simulate(program_state.animation_delta_time);
        // Draw each shape at its current location:
        for (let b of this.bodies)
            b.shape.draw(context, program_state, b.drawn_location, b.material);

        //this.update_state(program_stateanimation_delta_time);
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new Movement_Controls_2());
            //Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.look_at(
                vec3(0, 1.9, 10.1),
                vec3(0, 1.9, 0),
                vec3(0, 1, 0)
            )); // Locate the camera here
        }

        if(Math.abs(this.children[0].thrust[0]) > 0 || Math.abs(this.children[0].thrust[1]) > 0 || Math.abs(this.children[0].thrust[2]) > 0){
            this.moving = true;
        }else{
            this.moving = false;
        }

        
        if (this.attached){
            if (this.attached() != null){
                const planet_position = this.attached().times(vec4(0, 0, 0, 1)); 
                this.light_position = Mat4.translation(0,0,0).times(planet_position);
            }
        }
        //const planet_position = program_state.camera_transform.times(vec4(0, 0, 0, 1)); 
        //console.log("inverse?" + program_state.camera_inverse)

        let base_pos = Mat4.identity().times(Mat4.translation(0.01*Math.sin(t/900), 0.1*Math.sin(t/900), -2)).times(vec4(0, 0, 0, 1));
        this.light_position = program_state.camera_transform.times(base_pos);
        //this.light_position = program_state.camera_transform.times(vec4(0, 0, 0, 1));

        let base_p= Mat4.identity().times(Mat4.translation(2.5,-1.5,-1));
        //this.light_position = program_state.camera_transform.times(base_p);
        
        this.light_color = color(1,1,1,1);

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        //this.light_view_target = vec4(this.light_position[0], this.light_position[1], this.light_position[2] - 10, 1);
        let base_transform = Mat4.identity().times(Mat4.translation(0.01*Math.sin(t/900), 0.1*Math.sin(t/900),-5)).times(vec4(0, 0, 0, 1));
        let testing = program_state.camera_transform.times(base_transform);
        //console.log("testing");
        //console.log(testing);
        this.light_view_target = testing;


        
        this.light_field_of_view = 90 * Math.PI / 180; // 130 degree
        program_state.lights = [new Light(this.light_position, this.light_color, 90)];
        if(!this.hover){
            program_state.lights = [new Light(this.light_position, this.light_color, 1000)];
        }else{
            program_state.lights = [new Light(this.light_position, this.light_color, 0)];
        }


        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 100);
        
        // Bind the Depth Texture Buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Prepare uniforms
        program_state.light_view_mat = light_view_mat;
        //program_state.light_view_mat = program_state.camera_inverse;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false,false, false);

        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);

        // //Step 3: display the textures
        if (this.shadowView){
            this.shapes.square_2d.draw(context, program_state,
                Mat4.translation(-.99, .08, 0).times(
                Mat4.scale(0.5, 0.5 * gl.canvas.width / gl.canvas.height, 1)
                ),
                this.depth_tex.override({texture: this.lightDepthTexture})
            );            
        }

    }

    
    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:
        // //console.log("Hello world");
        if (this.swarm){
            while (this.bodies.length < 100)
                this.bodies.push(new Body(this.shapes.sphere, this.stars , vec3(0.3, 0.3 + Math.random(), 0.3))
                    .emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
                        vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random()));            
        }

        for (let b of this.bodies) {
            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * -9.8;
            // If about to fall through floor, reverse y velocity:
            if (b.center[1] < 0 && b.linear_velocity[1] < 0)
                b.linear_velocity[1] *= -.8;
            // Simple Sphere Collision Implementation
            let dis = b.center.minus(this.agent_pos);
            if (dis.norm() < this.agent_size) {
                b.linear_velocity.add_by(dis.times(dt * 98));
            }
        }


        // Delete bodies that stop or stray too far away:
        this.bodies = this.bodies.filter(b => b.center.norm() < 50 && (b.linear_velocity.norm() > 2 || b.center[1] > -8));
    }

    show_explanation(document_element) {
        document_element.innerHTML += "<p>This is a first test for the team project "
            + " undecided project"
            + "</p><p>Using the shadow template</p>";
    }
}


//***************************************Movement is now in ./first-person-controller.js */
//***************************************Shaders are now in ./shaders.js */