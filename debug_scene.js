import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
import {Item_System, Item} from "./item-system.js";
import {Interaction_System} from "./interaction-system.js";
import {Room_Builder} from "./room-builder.js";
import {Movement_Controls_2} from './first-person-controller.js' 
import { Shadow_Fog_Textured_Phong_Shader, Shadow_Scroll_Textured_Phong_Shader } from './shaders.js';
import {Shape_From_File} from './examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'
//import {monster_trigger} from './first-person-controller.js'

// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

let open_skull_door = false;
export {open_skull_door};

let gate_open = false;
export {gate_open};

let skull_drop = false;
export {skull_drop};

let open_hall_door = false;
export {open_hall_door};

const gate_room_base_transform = Mat4.identity();

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
export class DebugScene extends Simulation {

    mouse_ray = vec3(0, 0, 0);
    constructor() {
        super();

        this.shapes = {
            "teapot": new Shape_From_File("assets/teapot.obj"),
            "blender_cube": new Shape_From_File("assets/blender_cube.obj"),
            "Flashlight": new Shape_From_File("assets/flash.obj"),
            "picture": new Shape_From_File("assets/Picture.obj"),
            "table": new Shape_From_File("assets/Small Dirty Table 01.obj"),
            "monster": new Shape_From_File("assets/thing.obj"),
            "key": new Shape_From_File("assets/key.obj"),
            "chain": new Shape_From_File("assets/chain.obj"),
            "skeleton": new Shape_From_File("assets/skeleton.obj"),
            "barrel1": new Shape_From_File("assets/barrel1.obj"),
            "barrel2": new Shape_From_File("assets/barrel2.obj"),
            "barrel3": new Shape_From_File("assets/barrel3.obj"),
            "barrel4": new Shape_From_File("assets/barrel4.obj"),
            "skull": new Shape_From_File("assets/Skull.obj"),
            "sphere": new Subdivision_Sphere(6),
            "cube": new Cube(),
            "floor": new Cube(),
            "square_2d": new Square(),
        };
        this.shapes.floor.arrays.texture_coord.forEach(p => p.scale_by(4*5));


        let moon;
        let agent_body;
        let shadowView = false;
        let moving = false;
        this.timer_offset = 0;
        this.t = 0;
        
        // Debug wall (for easier placement)
        //create_wall_x(xPos, zPos, length, height, material) {
            this._debug_xPos= 1;
            this._debug_zPos = 1;
            this._debug_length = 1;
            this._debug_height = 1;
            this._debug_material = 0;
            this._debug_orientation = 0;
            this._debug_precision = 1;
            this._debug = false;
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
            ambient: .4, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/texture01.png"),
            light_depth_texture: null
        });

        // For the monster
        this.mon = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.2, .2, .2, 1),
            ambient: .4, diffusivity: 1, specularity: .5,
            color_texture: new Texture("assets/full_low_body__BaseColor.png"),
            light_depth_texture: null
        });

        // For the floor or other plain objects
        this.floor = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.2, .2, .2, 1),
            ambient: 0.6, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/CastleWall.png"),
            light_depth_texture: null
        })

        this.Wall = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/CastleWall.png"),
            light_depth_texture: null
        })

        this.Key = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.2, .2, .2, 1),
            ambient: 1, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/key_color.png"),
            light_depth_texture: null
        })

        this.Chain = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/chain_tex.jpg"),
            light_depth_texture: null
        })

        this.barrel = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/Barrels_Albedo.png"),
            light_depth_texture: null
        })

        this.skeleton = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/diffuseMap.png"),
            light_depth_texture: null
        })

        this.wood_door = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/wood_door.png"),
            light_depth_texture: null
        })

        this.skull = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/skull_Base_color.png"),
        })

        this.bar = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(0.1, 0.1, 0.1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            light_depth_texture: null
        })

        this.water = new Material(new Shadow_Scroll_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.6, diffusivity: 0.8, specularity: 0.9,
            color_texture: new Texture("assets/water.png"),
        })

        this.thing = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.6, diffusivity: 0.3, specularity: 0.4,
            color_texture: new Texture("assets/thing_Base_color.png"),
        })

        this.invisible = new Material(new Phong_Shader(), {
            color: color(0, 0, 0, 0),
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

    }

    make_control_panel() {
        this.key_triggered_button("Toggle Debug Box", ["Shift", "G"],
            () => this._debug = !this._debug);
        this.new_line();
        this.key_triggered_button("-_debug_zPos", ["Shift", "W"],
            () => this._debug_zPos -= this._debug_precision);
        this.key_triggered_button("+_debug_zPos",   ["Shift", "S"],
            () => this._debug_zPos += this._debug_precision);
            this.new_line();
        this.key_triggered_button("-_debug_xPos",   ["Shift", "A"],
            () => this._debug_xPos -= this._debug_precision);
        this.key_triggered_button("+_debug_xPos",  ["Shift", "D"],
            () => this._debug_xPos += this._debug_precision);
            this.new_line();
            this.new_line();
        this.key_triggered_button("-_debug_length",  ["r"],
            () => this._debug_length -= this._debug_precision);
        this.key_triggered_button("+_debug_length",  ["q"],
            () => this._debug_length += this._debug_precision);
            this.new_line();
        this.key_triggered_button("-_debug_height",  ["Shift","R"],
            () => this._debug_height -= this._debug_precision);
        this.key_triggered_button("+_debug_height",  ["Shift","Q"],
            () => this._debug_height += this._debug_precision);
            this.new_line();
            this.new_line();
        this.key_triggered_button("-_debug_precision",  ["Shift","J"],
            () => this._debug_precision *= 2);
        this.key_triggered_button("+_debug_precision",  ["Shift","K"],
            () => this._debug_precision /= 2);
            this.new_line();
        this.key_triggered_button("-_debug_orientation",  ["Shift","O"],
            () => this._debug_orientation += 1);
            this.new_line();

        // this.key_triggered_button("Interact", ["e"], this.on_interact, undefined);

    }

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
        this.Key.light_depth_texture = this.light_depth_texture
        this.Chain.light_depth_texture = this.light_depth_texture
        this.skeleton.light_depth_texture = this.light_depth_texture
        this.barrel.light_depth_texture = this.light_depth_texture
        this.skull.light_depth_texture = this.light_depth_texture


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

        program_state.draw_shadow = draw_shadow;

        // Debug
        let _debug_transform = Mat4.translation(this._debug_xPos, this._debug_height/2, this._debug_zPos).times(Mat4.scale(this._debug_length/2, this._debug_height/2, 0.25));
        if (this._debug_orientation % 3 == 0) {
            _debug_transform = Mat4.translation(this._debug_xPos, this._debug_height/2, this._debug_zPos).times(Mat4.scale(0.25, this._debug_height/2, this._debug_length/2));
        }
        if (this._debug_orientation % 3 == 1) {
            _debug_transform = Mat4.translation(this._debug_xPos, 0, this._debug_zPos).times(Mat4.scale(this._debug_height/2, 1, this._debug_length/2));
        }
        this.shapes.cube.draw(context, program_state, _debug_transform, shadow_pass? this.pic2 : this.pure);
        console.log("x: " + this._debug_xPos + "  z:  " + this._debug_zPos + "  length:  " + this._debug_length + "  height:  " + this._debug_height + "  mat:  " + this._debug_material + "  precision:  " + this._debug_precision);
        console.log("room0.create_wall_z("+this._debug_xPos+","+ this._debug_zPos+"," +this._debug_length+","+ this._debug_height+", this.Wall); " );

    }

    display(context, program_state) {
        const t = program_state.animation_time;
        const gl = context.context;
        if (this._debug){
            this.render_scene(context, program_state, true,true, true);            
        }



    }
}


//***************************************Movement is now in ./first-person-controller.js */
//***************************************Shaders are now in ./shaders.js */