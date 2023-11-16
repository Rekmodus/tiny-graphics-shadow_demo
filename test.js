//import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

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

export class Simulation extends Scene {
    // **Simulation** manages the stepping of simulation time.  Subclass it when making
    // a Scene that is a physics demo.  This technique is careful to totally decouple
    // the simulation from the frame rate (see below).
    constructor() {
        super();
        Object.assign(this, {time_accumulator: 0, time_scale: 1/1000.0, t: 0, dt: 1 / 50, bodies: [], steps_taken: 0});
    }

    simulate(frame_time) {
        // simulate(): Carefully advance time according to Glenn Fiedler's
        // "Fix Your Timestep" blog post.
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) b.blend_state(alpha);
    }

    make_control_panel() {
        // make_control_panel(): Create the buttons for interacting with simulation time.
        this.key_triggered_button("Speed up time", ["Shift", "T"], () => this.time_scale *= 5);
        this.key_triggered_button("Slow down time", ["t"], () => this.time_scale /= 5);
        this.new_line();
        this.live_string(box => {
            box.textContent = "Time scale: " + this.time_scale
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = "Fixed simulation time step size: " + this.dt
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = this.steps_taken + " timesteps were taken so far."
        });
    }

    display(context, program_state) {
        // display(): advance the time and state of our whole simulation.
        if (program_state.animate)
            this.simulate(program_state.animation_delta_time);
        // Draw each shape at its current location:
        for (let b of this.bodies)
            b.shape.draw(context, program_state, b.drawn_location, b.material);
    }

    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }
}
    

// The scene
export class Team_project extends Simulation {
    constructor() {
        super();
        this.walls = [];

        //this.shapes = Object.assign({}, this.data.shapes);
        //this.shapes.square = new defs.Square();
        const shader = new defs.Fake_Bump_Map(1);
        // this.material = new Material(shader, {
        //     color: color(0, 0, 0, 1),
        //     ambient: .5, texture: this.data.textures.stars
        // })
        // Load the model file:
        this.shapes = {
            "teapot": new Shape_From_File("assets/teapot.obj"),
            "blender_cube": new Shape_From_File("assets/blender_cube.obj"),
            "Flashlight": new Shape_From_File("assets/flash.obj"),
            "picture": new Shape_From_File("assets/Picture.obj"),
            "table": new Shape_From_File("assets/Small Dirty Table 01.obj"),
            "monster": new Shape_From_File("assets/monster.obj"),
            "sphere": new Subdivision_Sphere(6),
            "cube": new Cube(),
            "square_2d": new Square(),
        };

        let moon;
        let agent_body;
        let flashlight_COI;

        // For the teapot
        this.stars = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(.5, .5, .5, 1),
            ambient: .4, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/stars.png"),
            light_depth_texture: null
        });
        // this.stars = new Material(new Texture_Scroll_X(), {
        //         color: hex_color("#000000"),
        //         ambient: 1, diffusivity: 1.0, specularity: 0.5,
        //         texture: new Texture("assets/stars.png", "LINEAR_MIPMAP_LINEAR")
        //     }),

        // For the flashlight
        this.flash = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(.0, .0, .0, 1),
            ambient: .9, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/flash.png"),
            light_depth_texture: null
        });
        // For the flashlight
        this.pic2 = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(.0, .0, .0, 1),
            ambient: .9, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/text.png"),
            light_depth_texture: null
        });

        // For the Picture
        this.pic = new Material(new Texture_Scroll_X(), {
            color: hex_color("#000000"),
            ambient: 1, diffusivity: 1.0, specularity: 0.5,
            texture: new Texture("assets/sh.png", "LINEAR_MIPMAP_LINEAR")
        });
        // texture2: new Material(new Texture_Scroll_X(), {
        //     color: hex_color("#000000"),
        //     ambient: 1, diffusivity: 1.0, specularity: 0.5,
        //     texture: new Texture("assets/kyo.png", "LINEAR_MIPMAP_LINEAR")
        // }),

        // For the table
        this.wood = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(0, 0, 0, 1),
            ambient: 0.5, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/texture01.png"),
            light_depth_texture: null
        });

        // For the monster
        this.mon = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(.0, .0, .0, 1),
            ambient: 0.5, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/full_low_body__BaseColor.png"),
            light_depth_texture: null
        });

        // For the floor or other plain objects
        this.floor = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: hex_color("#cc0000"),
            ambient: 0, diffusivity: 0.5, specularity: 0.4, smoothness: 64,
            color_texture: null,
            light_depth_texture: null
        })
        // // For the floor or other plain objects
        // this.floor = new Material(new Shadow_Textured_Phong_Shader(1), {
        //     color: hex_color("#de3163"),
        //     ambient: 0, diffusivity: 0.5, specularity: 0.4, smoothness: 64,
        //     color_texture: new Texture("assets/full_low_body__BaseColor.png"),
        //     light_depth_texture: null
        // })
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
        this.agent = new Shape_From_File("assets/teapot.obj");
        this.agent_pos = vec3(1.2, 1, 3.5);
        this.agent_size = 1.0;

        this.control = {};
        this.control.w = false;
        this.control.a = false;
        this.control.s = false;
        this.control.d = false;
        this.control.e = false;
        this.control.space = false;

        this.data = new Test_Data();
    }

    random_color() {
        return this.material.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
    }

    make_control_panel() {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Test control panel!!: ";
        // The next line adds a live text readout of a data member of our Scene.
        this.live_string(box => {
            box.textContent = (this.hover ? 0 : (this.t % (2 * Math.PI)).toFixed(2)) + " radians"
        });
        this.new_line();
        this.new_line();
        // Add buttons so the user can actively toggle data members of our Scene:
        this.key_triggered_button("H", ["h"], function () {
            this.hover ^= 1;
        });
        this.new_line();
        this.key_triggered_button("S", ["m"], function () {
            this.swarm ^= 1;
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
            this.key_triggered_button("Attach to object", ["m"], () => this.attached = () => this.moon);
        }

    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.stars.light_depth_texture = this.light_depth_texture
        this.floor.light_depth_texture = this.light_depth_texture

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
        const t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            // this.shapes.sphere.draw(context, program_state,
            //     Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5,.5,.5)),
            //     this.light_src.override({color: light_color}));
        }

        for (let i of [-1, 1]) { // Spin the 3D model shapes as well.
            const model_transform = Mat4.translation(2 * i, 3, 0)
                .times(Mat4.rotation(t / 1000, -1, 2, 0))
                .times(Mat4.rotation(-Math.PI / 2, 0, 1, 0));
            this.shapes.table.draw(context, program_state, model_transform, shadow_pass? this.wood : this.pure);
        }

        let model_trans_floor = Mat4.translation(0, 0, 0).times(Mat4.scale(8, 0.1, 5));
        let model_trans_ball_0 = Mat4.translation(0, 1, 0);
        let model_trans_ball_1 = Mat4.translation(5, 0.5, 0);
        let model_trans_ball_2 = Mat4.translation(-5, 1.8, 0).times(Mat4.scale(0.5, 0.5, 0.5));
        let model_trans_ball_3 = Mat4.translation(0, 1, 3);
        let model_trans_ball_4 = Mat4.translation(-5, 1, -3);
        let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 5));
        let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 8));
        let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 5, 0.33));

        // if (this.walls.length < 1){
        //     this.bodies.push(new Body(this.shapes.cube, this.stars , vec3(1, 1, 1))
        //     .emplace(model_trans_wall_1,
        //         vec3(0, 0, 0),0));
        //     //this.walls.push(new Body(this.shapes.cube.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure)));
        //     //this.walls.push(new Body(this.shapes.cube.draw(context, program_state, model_trans_wall_1, shadow_pass? this.floor : this.pure)));
        // }

        this.shapes.cube.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_1, shadow_pass? this.floor : this.pure);
        
        this.shapes.cube.draw(context, program_state, model_trans_wall_2, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_3, shadow_pass? this.floor : this.pure);

        //const planet_position = program_state.camera_transform.times(vec4(0, 0, 0, 1)); 

        //this.light_position = Mat4.translation(0,0,0).times(planet_position);
        //this.shapes.cube.draw(context, program_state, Mat4.translation(0,0,1).times(planet_position), shadow_pass? this.floor : this.pure);

        
        this.shapes.sphere.draw(context, program_state, model_trans_ball_0, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_1, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_2, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_3, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_4, shadow_pass? this.floor : this.pure);

        this.shapes.table.draw(context, program_state, model_trans_ball_1, shadow_pass? this.wood : this.pure);
        this.shapes.monster.draw(context, program_state, model_trans_ball_2, shadow_pass? this.mon : this.pure);

            
        let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2]).
        times(Mat4.scale(this.agent_size,this.agent_size,this.agent_size));
        this.moon = agent_trans;
        // console.log("moon!!" + this.moon);
        //() => this.attached = () => this.agent_trans_;

        this.agent_body = new Body(this.agent.draw(context, program_state, agent_trans, shadow_pass? this.stars : this.pure));

    
        if (this.attached){
            if (this.attached() != null){
                //console.log(this.attached());
                //program_state.set_camera(this.attached().times(Mat4.translation(0,0,5)));     
                const planet_position = this.attached().times(vec4(0, 0, 0, 1)).to3(); // Get the position of the attached planet
                const eye = planet_position.plus(vec3(0, 5, 9)); // Set the camera position relative to the planet
                const target = planet_position; // Set the camera target to the planet's position
        
                // Set the camera to follow the attached planet
                //program_state.set_camera(Mat4.look_at(eye, target, vec3(0, 1, 0)));       
                //let desired =  Mat4.look_at(eye, target, vec3(0, 1, 0))
                //

                //let blending_factor = 0.1;
                
                //program_state.camera_inverse = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
                               // Set the camera to follow the attached planet
                //program_state.set_camera(Mat4.look_at(eye, target, vec3(0, 1, 0)));       
                let desired =  Mat4.look_at(eye, target, vec3(0, 1, 0))
                //

                let blending_factor = 1.0;
                //console.log(program_state.camera_inverse[i]);
                //let pos = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor))
                
                program_state.camera_inverse = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
            }
        }
        // console.log("cam transform?");
        // console.log(program_state.camera_transform);
   
        let base_transform = Mat4.identity().times(Mat4.scale(0.5,0.5,0.5).times(Mat4.translation(2.5 + 0.01*Math.sin(t/900),-1.5 + 0.1*Math.sin(t/900),-6)));
        this.shapes.Flashlight.draw(context, program_state, program_state.camera_transform.times(base_transform), shadow_pass? this.flash : this.pure);
        
        //this.shapes.blender_cube.draw(context, program_state, this.flashlight_COI, shadow_pass? this.stars : this.pure);

        let model_transform = Mat4.identity();
        this.shapes.picture.draw(context, program_state, Mat4.translation(-2,2,0).times(Mat4.rotation(t/1000, 1,0,0)).times(model_transform), this.pic2);
        // for some reasion the textures after are exactly the one before when using the other things.
        this.shapes.picture.draw(context, program_state, Mat4.translation(-5,2,0).times(model_transform), this.pic.override({texture: new Texture("assets/sh.png", "LINEAR_MIPMAP_LINEAR")}));
        this.shapes.picture.draw(context, program_state, model_trans_ball_4, this.pic);
        this.shapes.picture.draw(context, program_state, Mat4.translation(0, 1, 0).times(model_trans_ball_4), this.pic);
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
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls_2());
            //Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.look_at(
                vec3(0, 1.1, 10.1),
                vec3(0, 1.1, 0),
                vec3(0, 1, 0)
            )); // Locate the camera here
        }
        // console.log("cam transform?");
        // console.log(program_state.camera_transform);

        // if (this.attached){
        //     if (this.attached() != null){
        //         console.log(this.attached());
        //         //program_state.set_camera(this.attached().times(Mat4.translation(0,0,5)));     
        //         const planet_position = this.attached().times(vec4(0, 0, 0, 1)).to3(); // Get the position of the attached planet
        //         const eye = planet_position.plus(vec3(0, 9, 9)); // Set the camera position relative to the planet
        //         const target = planet_position; // Set the camera target to the planet's position
        
        //         // Set the camera to follow the attached planet
        //         program_state.set_camera(Mat4.look_at(eye, target, vec3(0, 1, 0)));       
        //         //let desired =  Mat4.look_at(eye, target, vec3(0, 1, 0))
        //         //

        //         //let blending_factor = 0.1;
                
        //         //program_state.camera_inverse = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
        //     }
        // }


        // The position of the light
        //this.light_position = Mat4.rotation(t / 1500, 0, 1, 0).times(vec4(3, 6, 0, 1));
        
        if (this.attached){
            if (this.attached() != null){
                const planet_position = this.attached().times(vec4(0, 0, 0, 1)); 
                console.log(planet_position);
                console.log(this.attached());
                //let pos = this.attached().times(vec4(0, 0, 0, 1)).to3();
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
        


        //this.light_position = vec4(3, 6, 0, 1);
        // The color of the light
        this.light_color = color(
            0.667 + Math.sin(t/500) / 3,
            0.667 + Math.sin(t/1500) / 3,
            0.667 + Math.sin(t/3500) / 3,
            1
        );
        this.light_color = color(1,1,1,1);

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        //this.light_view_target = vec4(this.light_position[0], this.light_position[1], this.light_position[2] - 10, 1);
        let base_transform = Mat4.identity().times(Mat4.translation(0.01*Math.sin(t/900), 0.1*Math.sin(t/900),-5)).times(vec4(0, 0, 0, 1));
        let testing = program_state.camera_transform.times(base_transform);
        console.log("testing");
        console.log(testing);
        this.light_view_target = testing;
        
        this.flashlight_COI = testing;
        //this.shapes.blender_cube.draw(context, program_state, testing, this.stars);

        //this.light_view_target = vec4(0,0,0, 1);
        
        this.light_field_of_view = 150 * Math.PI / 180; // 130 degree
        program_state.lights = [new Light(this.light_position, this.light_color, 90)];
        if(!this.hover){
            program_state.lights = [new Light(this.light_position, this.light_color, 300)];
        }else{
            program_state.lights = [new Light(this.light_position, this.light_color, 1)];
        }


        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
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

        //this.shapes.picture.draw(context, program_state, Mat4.translation(0, 1, 3), this.pic);

        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);

        // //Step 3: display the textures
        this.shapes.square_2d.draw(context, program_state,
            Mat4.translation(-.99, .08, 0).times(
            Mat4.scale(0.5, 0.5 * gl.canvas.width / gl.canvas.height, 1)
            ),
            this.depth_tex.override({texture: this.lightDepthTexture})
        );

    }

    
    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:
        // //console.log("Hello world");
        // while (this.bodies.length < 100)
        //     this.bodies.push(new Body(this.shapes.sphere, this.stars , vec3(1, 1 + Math.random(), 1))
        //         .emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
        //             vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random()));

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

        console.log(this.walls);
        let colliders = {intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1};
        for (let w of this.walls){
            // Simple Sphere Collision Implementation

            if (w.check_if_colliding(this.agent_body, colliders)){
                console.log("Colliding");
            }
            // Simple Sphere Collision Implementation
            console.log(w);
            // let dis = w.center.minus(this.agent_pos);
            // if (dis.norm() < this.agent_size) {
            //     w.linear_velocity.add_by(dis.times(dt * 98));
            // }

        }
        // Control
        let speed = 10.0;
        if (this.control.space)
            speed *= 3;
        if (this.control.w) {
            if (this.agent_pos[2] >= -30){
                //console.log("up" + this.agent_pos[2]);
                this.agent_pos[2] -= dt * speed;
            }

        }
        if (this.control.s) {
            this.agent_pos[2] += dt * speed;
        }
        if (this.control.a) {
            this.agent_pos[0] -= dt * speed;
        }
        if (this.control.d) {
            this.agent_pos[0] += dt * speed;
        }
        if(this.control.e){
            // rotate by some angle along y axis
            // Define the rotation angle (you can adjust this value)
            let rotationSpeed = 0.5;
            const rotationAngle = dt * rotationSpeed;

            let angle = rotationAngle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            let rotationMatrix = [
                [cos, 0, -sin, 0],
                [0, 1, 0, 0],
                [sin, 0, cos, 0]
            ];

            let rotatedPosition = Mat4.rotation(angle,0,1,0).times(this.agent_pos).to3();
            //let rotatedPosition = Mat4.translation(this.agent_pos).times(rotationMatrix);
            // console.log(rotatedPosition);
            // console.log("pos" + this.agent_pos);
            this.agent_pos = rotatedPosition;

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

const Movement_Controls_2 = defs.Movement_Controls_2 =
    class Movement_Controls_2 extends Scene {
        // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other
        // scenes.  Rather than drawing anything it embeds both first-person and third-
        // person style controls into the website.  These can be used to manually move your
        // camera or other objects smoothly through your scene using key, mouse, and HTML
        // button controls to help you explore what's in it.
        constructor() {
            super();
            const data_members = {
                roll: 0, look_around_locked: false,
                thrust: vec3(0, 0, 0), pos: vec3(0, 0, 0), z_axis: vec3(0, 0, 0),
                radians_per_frame: 1 / 200, meters_per_frame: 4, speed_multiplier: 0.5
            };
            Object.assign(this, data_members);

            this.mouse_enabled_canvases = new Set();
            this.will_take_over_graphics_state = true;
        }

        set_recipient(matrix_closure, inverse_closure) {
            // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
            // instead, track an external target matrix to modify.  Targets must be pointer references
            // made using closures.
            this.matrix = matrix_closure;
            this.inverse = inverse_closure;
        }

        reset(graphics_state) {
            // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
            // encountered program_state object.  Targets must be pointer references made using closures.
            this.set_recipient(() => graphics_state.camera_transform,
                () => graphics_state.camera_inverse);

            console.log(graphics_state.camera_transform);
        }

        add_mouse_controls(canvas) {
            // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
            // First, measure mouse steering, for rotating the flyaround camera:
            this.mouse = {"from_center": vec(0, 0)};
            const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
                vec(e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2);
            // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
            // document.addEventListener("mouseup", e => {
            //     this.mouse.anchor = undefined;
            // });
            // canvas.addEventListener("mousedown", e => {
            //     e.preventDefault();
            //     this.mouse.anchor = mouse_position(e);
            // });
            canvas.addEventListener("mousemove", e => {
                e.preventDefault();
                this.mouse.from_center = mouse_position(e);
                this.mouse.from_center = [this.mouse.from_center[0], 0];
                //console.log(this.mouse.from_center[0])
                //console.log(this.mouse.from_center[1])
                //console.log(this.mouse.from_center)
            });
            canvas.addEventListener("mouseout", e => {
                if (!this.mouse.anchor) this.mouse.from_center.scale_by(0)
            });
        }

        show_explanation(document_element) {
        }

        make_control_panel() {
            // make_control_panel(): Sets up a panel of interactive HTML elements, including
            // buttons with key bindings for affecting this scene, and live info readouts.
            this.control_panel.innerHTML += "Click and drag the scene to spin your viewpoint around it.<br>";
            this.live_string(box => box.textContent = "- Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2)
                + ", " + this.pos[2].toFixed(2));
            this.new_line();
            // The facing directions are surprisingly affected by the left hand rule:
            this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
                + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
            this.new_line();
            this.new_line();

            //this.key_triggered_button("Up", [" "], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0);
            this.key_triggered_button("Forward", ["w"], () => this.thrust[2] = 1, undefined, () => this.thrust[2] = 0);
            this.new_line();
            this.key_triggered_button("Left", ["a"], () => this.thrust[0] = 1, undefined, () => this.thrust[0] = 0);
            this.key_triggered_button("Back", ["s"], () => this.thrust[2] = -1, undefined, () => this.thrust[2] = 0);
            this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
            this.new_line();
            //this.key_triggered_button("Down", ["z"], () => this.thrust[1] = 1, undefined, () => this.thrust[1] = 0);

            const speed_controls = this.control_panel.appendChild(document.createElement("span"));
            speed_controls.style.margin = "30px";
            this.key_triggered_button("-", ["o"], () =>
                this.speed_multiplier /= 1.2, undefined, undefined, undefined, speed_controls);
            this.live_string(box => {
                box.textContent = "Speed: " + this.speed_multiplier.toFixed(2)
            }, speed_controls);
            this.key_triggered_button("+", ["p"], () =>
                this.speed_multiplier *= 1.2, undefined, undefined, undefined, speed_controls);
            this.new_line();
            //this.key_triggered_button("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
            //this.key_triggered_button("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
            this.new_line();
            this.key_triggered_button("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1, "#8B8885");
            this.new_line();
            // this.key_triggered_button("Go to world origin", ["r"], () => {
            //     this.matrix().set_identity(4, 4);
            //     this.inverse().set_identity(4, 4)
            // }, "#8B8885");
            this.new_line();

            // this.key_triggered_button("Look at origin from front", ["1"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            // this.new_line();
            // this.key_triggered_button("from right", ["2"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            // this.key_triggered_button("from rear", ["3"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(0, 0, -10), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            // this.key_triggered_button("from left", ["4"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(-10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            this.new_line();
            // this.key_triggered_button("Attach to global camera", ["Shift", "R"],
            //     () => {
            //         this.will_take_over_graphics_state = true
            //     }, "#8B8885");
            this.new_line();
        }

        first_person_flyaround(radians_per_frame, meters_per_frame, leeway = 50) {
            // (Internal helper function)
            // Compare mouse's location to all four corners of a dead box:
            const offsets_from_dead_box = {
                plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
                minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
            };
            // Apply a camera rotation movement, but only when the mouse is
            // past a minimum distance (leeway) from the canvas's center:
            if (!this.look_around_locked)
                // If steering, steer according to "mouse_from_center" vector, but don't
                // start increasing until outside a leeway window from the center.
                for (let i = 0; i < 2; i++) {                                     // The &&'s in the next line might zero the vectors out:
                    let o = offsets_from_dead_box,
                        velocity = ((o.minus[i] > 0 && o.minus[i]) || (o.plus[i] < 0 && o.plus[i])) * radians_per_frame;
                    // On X step, rotate around Y axis, and vice versa.
                    this.matrix().post_multiply(Mat4.rotation(-velocity, i, 1 - i, 0));
                    this.inverse().pre_multiply(Mat4.rotation(+velocity, i, 1 - i, 0));
                }
            this.matrix().post_multiply(Mat4.rotation(-.1 * this.roll, 0, 0, 1));
            this.inverse().pre_multiply(Mat4.rotation(+.1 * this.roll, 0, 0, 1));
            // Now apply translation movement of the camera, in the newest local coordinate frame.
            this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
            this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
        }

        third_person_arcball(radians_per_frame) {
            // (Internal helper function)
            // Spin the scene around a point on an axis determined by user mouse drag:
            const dragging_vector = this.mouse.from_center.minus(this.mouse.anchor);
            if (dragging_vector.norm() <= 0)
                return;
            this.matrix().post_multiply(Mat4.translation(0, 0, -25));
            this.inverse().pre_multiply(Mat4.translation(0, 0, +25));

            const rotation = Mat4.rotation(radians_per_frame * dragging_vector.norm(),
                dragging_vector[1], dragging_vector[0], 0);
            this.matrix().post_multiply(rotation);
            this.inverse().pre_multiply(rotation);

            this.matrix().post_multiply(Mat4.translation(0, 0, +25));
            this.inverse().pre_multiply(Mat4.translation(0, 0, -25));
        }

        display(context, graphics_state, dt = graphics_state.animation_delta_time / 1000) {
            // The whole process of acting upon controls begins here.
            // const m = this.speed_multiplier * this.meters_per_frame,
            //     r = this.speed_multiplier * this.radians_per_frame;
            const m = this.meters_per_frame,
                r = this.speed_multiplier * this.radians_per_frame;

            if (this.will_take_over_graphics_state) {
                this.reset(graphics_state);
                this.will_take_over_graphics_state = false;
            }

            if (!this.mouse_enabled_canvases.has(context.canvas)) {
                this.add_mouse_controls(context.canvas);
                this.mouse_enabled_canvases.add(context.canvas)
            }
            // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
            this.first_person_flyaround(dt * r, dt * m);
            // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
            if (this.mouse.anchor)
                this.third_person_arcball(dt * r);
            // Log some values:
            this.pos = this.inverse().times(vec4(0, 0, 0, 1));
            this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));
            console.log("cam pos?" + this.pos);
            console.log("cam z?" + this.z_axis);
        }
    }

class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                vec2 f_tex_2 = f_tex_coord;
                vec2 f_tex_3 = vec2(f_tex_2.s - 2.0 * animation_time, f_tex_2.t);

                vec2 f_tex_4 = vec2(mod(f_tex_2.s - 2.0 * animation_time, 1.0), mod(f_tex_2.t, 1.0));

                vec4 tex_color = texture2D( texture, f_tex_3);      

                // if (((f_tex_4.s >= 0.25 && f_tex_4.s <= 0.75) && (f_tex_4.t >= 0.25 && f_tex_4.t <= 0.75)) ||
                // ((f_tex_4.s <= 0.15 || f_tex_4.s >= 0.85) || (f_tex_4.t <= 0.15 || f_tex_4.t >= 0.85))) {
                //     tex_color = texture2D( texture, f_tex_3);                    
                // }else{
                //     tex_color = vec4(0.0, 0.0, 0.0, 1.0); 
                // }
                //tex_color = vec4(0.0, 0.0, 0.0, 1.0); 

                if( tex_color.w < .01 ) discard;
            
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                            // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
    }
    
}
    
class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                float angle = -1.57 * animation_time;
                mat2 rotation_matrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                vec2 f_tex_2 = f_tex_coord;

                // Sample the texture image in the correct place:
                // vec4 tex_color = texture2D( texture, rotated_center + 0.5);
                // Reset or normalize the texture coordinates periodically
                if (animation_time > 0.1) {
                    f_tex_2 = vec2(f_tex_coord.s - floor(f_tex_coord.s), f_tex_coord.t - floor(f_tex_coord.t));
                }                
                vec2 f_tex_3 = ((f_tex_2 - 0.5) * rotation_matrix) + 0.5;
                vec4 tex_color = vec4(0.0, 0.0, 0.0, 1.0);
                if (((f_tex_3.s >= 0.25 && f_tex_3.s <= 0.75) && (f_tex_3.t >= 0.25 && f_tex_3.t <= 0.75)) ||
                ((f_tex_3.s <= 0.15 || f_tex_3.s >= 0.85) || (f_tex_3.t <= 0.15 || f_tex_3.t >= 0.85))) {
                    tex_color = texture2D( texture, f_tex_3);                    
                }

                if( tex_color.w < .01 ) discard;
                                                                            // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                            // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
    }
}
    
    