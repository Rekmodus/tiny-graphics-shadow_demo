import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
import {Item_System, Item} from "./item-system.js";
import {Interaction_System} from "./interaction-system.js";
import {Room_Builder} from "./room-builder.js";
import {Movement_Controls_2} from './first-person-controller.js' 
import { Shadow_Fog_Textured_Phong_Shader, Shadow_Scroll_Textured_Phong_Shader } from './shaders.js';
import {Shape_From_File} from './examples/obj-file-demo.js'
import {Text_Line} from './examples/text-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'
import {monster_trigger} from './first-person-controller.js'
import { Text_System } from './text-system.js';
import {walls} from './Walls.js'

// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

let open_skull_door = true;
export {open_skull_door};

let gate_open = false;
export {gate_open};

let skull_drop = false;
export {skull_drop};

let open_hall_door = true;
export {open_hall_door};

let open_gate_number;
export {open_gate_number};

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
export class Castle_of_shadows extends Simulation {

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
            text: new Text_Line(35),
            "axe": new Shape_From_File("assets/axe.obj"),
        };
        this.shapes.floor.arrays.texture_coord.forEach(p => p.scale_by(4*5));


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
            color: color(.1, .1, .1, 1),
            ambient: 0.6, diffusivity: 2, specularity: 1,
            color_texture: new Texture("assets/CastleWall.png"),
            light_depth_texture: null
        })

        this.Wall = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.6, diffusivity: 2, specularity: 2,
            color_texture: new Texture("assets/CastleWall.png"),
            light_depth_texture: null
        })

        this.Key = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.2, .2, .2, 1),
            ambient: 1, diffusivity: 1, specularity: 2,
            color_texture: new Texture("assets/key_color.png"),
            light_depth_texture: null
        })

        this.Chain = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.1, .1, .1, 1),
            ambient: 0.5, diffusivity: 1, specularity: 2,
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
            ambient: 0.5, diffusivity: 1, specularity: 2,
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
            ambient: 0.5, diffusivity: 1, specularity: 2,
            color_texture: new Texture("assets/skull_Base_color.png"),
        })

        this.bar = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(0.1, 0.1, 0.1, 1),
            ambient: 0.5, diffusivity: 5, specularity: 2,
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

        this.cracked_wood = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.025, .025, .025, 1),
            ambient: 0.5, diffusivity: 1, specularity: 1,
            color_texture: new Texture("assets/Old Wood.png"),
            light_depth_texture: null
        })

        this.axe = new Material(new Shadow_Fog_Textured_Phong_Shader(1), {
            color: color(.025, .025, .025, 1),
            ambient: 0.5, diffusivity: 1, specularity: 2,
            color_texture: new Texture("assets/Axe_BaseColor.png"),
            light_depth_texture: null
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

        // The agent
        // this.agent = new defs.Subdivision_Sphere(4);
        // This is old code from the collision demo. We could reuse it somehow
        this.agent = new defs.Subdivision_Sphere(4);
        this.agent_pos = vec3(0, 1.9, 10.1);
        this.agent_size = 2.5;

        this.control = {};
        this.control.w = false;
        this.control.a = false;
        this.control.s = false;
        this.control.d = false;
        this.control.e = false;
        this.control.space = false;

        this.data = new Test_Data();

//Item System

        //let model_transform = Mat4.translation(5, 1.5, 0).times(Mat4.rotation(-Math.PI/2, 1, 0, 0));

        Item_System.held_item = null; //Item_System.create_item(Item.Flashlight, this.shapes.blender_cube, Mat4.identity(), this.flash);

        //let box_transform = gate_room_base_transform.times(Mat4.translation(0, 0.125, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)).times(Mat4.scale(0.5, 0.5, 0.5));
        let key_transform = gate_room_base_transform.times(Mat4.translation(-3, 0.75, -5)).times(Mat4.rotation(-Math.PI/2, 0, 0, 1)).times(Mat4.scale(0.5, 0.5, 0.5));
        //Item_System.create_item(Item.Box, this.shapes.cube, box_transform, this.wood_door);
        Item_System.create_item(Item.Key, this.shapes.key, key_transform, this.Key);

        let box_transform = gate_room_base_transform.times(Mat4.translation(0, 0.125, 0)).times(Mat4.rotation(-Math.PI/2 + 0.3, 1, 1, 0.1)).times(Mat4.scale(0.7, 0.7, 0.7));
        Item_System.create_item(Item.Box, this.shapes.skull, box_transform, this.skull);


        //this.item_sys.create_item(Item.Debug, this.shapes.cube, Mat4.translation(0, 1, 10), this.wood);
        //this.item_sys.create_item(Item.Key, this.shapes.teapot, model_transform, this.wood);

//Interaction System

        Interaction_System.create_interaction(gate_room_base_transform.times(Mat4.translation(-3.75, 0, 0)), (interaction) => {
            if (!Item_System.player_holds(Item.Box)) {return}

            Item_System.destroy(Item_System.held_item);
            Interaction_System.destroy(interaction);
            Text_System.typewriter_animation(this.insight_text, "The gate has opened");
            gate_open = true;
        })

        /*
        this.interact_sys.create_interaction(Mat4.translation(5, 1, 10), (interaction) => {
            if (!this.item_sys.player_holds(Item.Key)) {
                console.log("Bring me some tea!!!");
                return;
            }

            console.log("This teapot is empty. Whatever, you can pass.");
            this.item_sys.destroy(this.item_sys.held_item);
            this.interact_sys.destroy(interaction);
            open_teapot_door = true;
        });
        */

//Room Test
        /*
        let room1 = Room_Builder.create_room(Mat4.translation(5, 0, 20));

        room1.create_wall_x(0, 0, 4, 3, this.Wall);
        room1.create_wall_x(0, 10, 4, 3, this.Wall);
        room1.create_wall_z(2, 5, 10, 3, this.Wall);
        room1.create_wall_z(-2, 5, 2, 2, this.Wall);
        room1.create_wall_z(-2, 1, 2, 3, this.Wall);

        room1.create_floor_ceil(0, 5, 4, 10, 3, this.floor);

        room1.create_obj(this.shapes.table, Mat4.translation(0, 0, 5), this.wood);

        let test_key_transform = Mat4.translation(0, 0.75, 5).times(Mat4.rotation(-Math.PI/2, 0, 0, 1)).times(Mat4.scale(0.5, 0.5, 0.5));
        room1.create_item(Item.Key, this.shapes.key, test_key_transform, this.Key);

        room1.create_door_z(-2, 3, 2, 3, this.wood_door, (door) => {
            if (!Item_System.player_holds(Item.Key)) {return;}
            door.open = true;
            Item_System.destroy(Item_System.held_item);
        });

        let trigger = Mat4.translation(0, 0, 5).times(Mat4.scale(1, 1, 2));
        room1.create_trigger(trigger, () => {console.log("Trigger!");});
        */

//Room 3
        {
            this.room3_parent = Mat4.translation(-25, 0, -5);
            this.room3 = {
                "wall_left": Mat4.translation(-5, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 5)),
                //"wall_right": Mat4.translation(+5, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 5)),
                "wall_right1": Mat4.translation(+5, 2 - 0.1, 7).times(Mat4.scale(0.33, 5, 5)),
                "wall_right2": Mat4.translation(+5, 2 - 0.1, -7).times(Mat4.scale(0.33, 5, 5)),
                "wall_back": Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(5, 5, 0.33)),
                "wall_front": Mat4.translation(0, 2 - 0.1, +5).times(Mat4.scale(5, 5, 0.33)),
                //"wall_front": Mat4.translation(-8, 2 - 0.1, +5).times(Mat4.scale(5, 5, 0.33)),
                //"wall_front2": Mat4.translation(+8, 2 - 0.1, +5).times(Mat4.scale(5, 5, 0.33)),
                "ceiling": Mat4.translation(0, 5, 0).times(Mat4.scale(5, 0.33, 5)),
                "floor": Mat4.translation(0, -0.1, 0).times(Mat4.scale(5, 0.1, 5)),


                // hallway

                "wall_back_hall": Mat4.translation(8, 2 - 0.1, -2).times(Mat4.scale(4, 5, 0.33)),
                "wall_front_hall2": Mat4.translation(6, 2 - 0.1, 2).times(Mat4.scale(1, 5, 0.33)),
                "wall_right_hall": Mat4.translation(6, 2 - 0.1, 11).times(Mat4.scale(0.33, 4, 9)),
                "wall_right_hall2": Mat4.translation(10, 2 - 0.1, 5).times(Mat4.scale(0.33, 5, 10)),

                // corner
                "wall_back_corner": Mat4.translation(14, 2 - 0.1, 15).times(Mat4.scale(4, 4, 0.33)),
                "wall_front_corner2": Mat4.translation(10, 2 - 0.1, 19).times(Mat4.scale(4, 4, 0.33)),

                "wall_front1": Mat4.translation(14, 2 - 0.1, 23.5).times(Mat4.scale(0.33, 5, 5)),
                "wall_front2": Mat4.translation(17, 2 - 0.1, 12).times(Mat4.scale(0.33, 3, 3)),

            }

            // Key
            let key_transform = this.room3_parent.times(Mat4.translation(0, 0.75, 0)).times(Mat4.rotation(-Math.PI/2, 0, 0, 1)).times(Mat4.scale(0.5, 0.5, 0.5));
            Item_System.create_item(Item.Debug, this.shapes.key, key_transform, this.Key);
            /*
            Interaction_System.create_interaction(gate_room_base_transform.times(Mat4.translation(5, 1, 10)), (interaction) => {
                if (!Item_System.player_holds(Item.Debug)) {
                    console.log("Skull Door is locked");
                    Text_System.typewriter_animation(this.insight_text, "Door is locked");
                    return;
                }
                console.log("You unlocked the skull door");
                Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
                Item_System.destroy(Item_System.held_item);
                Interaction_System.destroy(interaction);
                open_skull_door = true;
            });*/
            /*
            Interaction_System.create_interaction(this.room3_parent.times(Mat4.translation(8, 1, 14).times(Mat4.scale(1.5, 5, 0.25))), (interaction) => {
                if (!Item_System.player_holds(Item.Key)) {
                    console.log("Door is locked");
                    Text_System.typewriter_animation(this.insight_text, "Door is locked");
                    return;
                }
                console.log("You unlocked the door");
                Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
                Item_System.destroy(Item_System.held_item);
                Interaction_System.destroy(interaction);
                open_hall_door = true;
            });
            */
        }

        //Jail Room
        {
            this.room4_parent = Mat4.translation(-19, 0, 38.5);
            let room4 = Room_Builder.create_room(this.room4_parent);

            //Walls, Floor, and Ceiling

            room4.create_wall_x(0, -15, 16, 3, this.Wall);

            room4.create_wall_x(-4.625, 0, 6.75, 3, this.Wall);
            room4.create_wall_x(4.625, 0, 6.75, 3, this.Wall);

            room4.create_wall_z(-8, -7.5, 15, 3, this.Wall);
            room4.create_wall_z(8, -7.5, 15, 3, this.Wall);

            room4.create_wall_x(-7.75, -11, 0.5, 3, this.Wall);
            room4.create_wall_x(-4, -11, 1, 3, this.Wall);
            room4.create_wall_x(0, -11, 1, 3, this.Wall);
            room4.create_wall_x(4, -11, 1, 3, this.Wall);
            room4.create_wall_x(7.75, -11, 0.5, 3, this.Wall);

            //room4.create_wall_z(-4, -13, 4, 3, this.cracked_wood);
            room4.create_wall_z(0, -13, 4, 3, this.Wall);
            room4.create_wall_z(4, -13, 4, 3, this.Wall);

            room4.create_floor_ceil(0, -7.5, 16, 15, 3, this.Wall);

            //Table and Key

            let table_transform = Mat4.translation(-2, 0, -14);
            room4.create_obj(this.shapes.table, table_transform, this.wood);
            room4.create_item(Item.Key, this.shapes.key, table_transform.times(Mat4.translation(0, 0.75, 0)).times(Mat4.rotation(-Math.PI/2, 0, 0, 1)).times(Mat4.scale(0.5, 0.5, 0.5)), this.Key);

            //Gates

            this.gate_transform_1 = this.room4_parent.times(Mat4.translation(-6, 1.5, -11));
            this.gate_transform_2 = this.room4_parent.times(Mat4.translation(-2, 1.5, -11));
            this.gate_transform_3 = this.room4_parent.times(Mat4.translation(2, 1.5, -11));
            this.gate_transform_4 = this.room4_parent.times(Mat4.translation(6, 1.5, -11));

            this.gate_numbers = [walls.length, walls.length + 1, walls.length + 2, walls.length + 3];

            walls.push(this.gate_transform_1.times(Mat4.scale(2, 1, 0.25)));
            walls.push(this.gate_transform_2.times(Mat4.scale(2, 1, 0.25)));
            walls.push(this.gate_transform_3.times(Mat4.scale(2, 1, 0.25)));
            walls.push(this.gate_transform_4.times(Mat4.scale(2, 1, 0.25)));

            //Gate Switch
            this.open_gate_index = 0;
            open_gate_number = this.gate_numbers[this.open_gate_index];

            this.switch_transform = Mat4.translation(0, 0.75, -5);
            room4.create_obj(this.shapes.cube, this.switch_transform.times(Mat4.scale(0.25, 0.75, 0.25)), this.Wall);

            room4.create_interaction(this.switch_transform, () => {
                if (++this.open_gate_index >= 4) {this.open_gate_index = 0;}
                open_gate_number = this.gate_numbers[this.open_gate_index];
            });

            //Obstacles

            let barrel_scale = (t) => {return t.times(Mat4.scale(0.5, 0.5, 0.5))}
            /*
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-1, 0.5, -10)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-2, 0.5, -10)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-3, 0.5, -10)), this.barrel);

            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-1.5, 0.5, -9)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-2.5, 0.5, -9)), this.barrel);
            */
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-1.06, 0.5, -10.02)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-1.95, 0.5, -9.93)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-3.01, 0.5, -10.06)), this.barrel);

            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-1.52, 0.5, -9.09)), this.barrel);
            room4.create_obj(this.shapes.barrel2, barrel_scale(Mat4.translation(-2.46, 0.5, -8.98)), this.barrel);

            walls.push(this.room4_parent.times(Mat4.translation(-2, 0, -10.25).times(Mat4.scale(1.5, 1, 1.5))));

            //Axe

            room4.create_item(Item.Tool, this.shapes.axe, Mat4.translation(6, 0.625, -13.5).times(Mat4.rotation(-Math.PI/2 + 0.4, 1, 0, 0)).times(Mat4.scale(1, 1, 1)), this.axe);
            room4.create_obj(this.shapes.skull, Mat4.translation(6, 0.125, -13.5).times(Mat4.rotation(0.4, 0, 1, 0)).times(Mat4.scale(1/8, 1/8, 1/8)), this.skull);

            //Breakable Wall

            room4.create_door_z(-4, -13, 4, 3, this.cracked_wood, (door) =>{
                if (!Item_System.player_holds(Item.Tool)) {
                    Text_System.typewriter_animation(this.insight_text, "It looks fragile");
                    return;
                }
                Text_System.typewriter_animation(this.insight_text, "You break down the wall");
                door.open = true;
                Item_System.destroy(Item_System.held_item);
            });

            //Decor

            //Cell 4
            room4.create_obj(this.shapes.chain, Mat4.translation(6, 1.5, -14.5).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);

            //Cell 3
            room4.create_obj(this.shapes.skeleton, Mat4.translation(2.5, 0.125, -14).times(Mat4.rotation(-Math.PI/2 + 0.3, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)).times(Mat4.scale(0.5, 0.5, 0.5)), this.skeleton);

            //Main Room
            room4.create_obj(this.shapes.chain, Mat4.translation(-4, 2, -0.375).times(Mat4.rotation(Math.PI, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);
            room4.create_obj(this.shapes.chain, Mat4.translation(4, 2, -0.375).times(Mat4.rotation(Math.PI, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);
            room4.create_obj(this.shapes.barrel3, barrel_scale(Mat4.translation(-7, 0.5, -1)), this.barrel);
            room4.create_obj(this.shapes.barrel1, barrel_scale(Mat4.translation(7, 0.5, -1)), this.barrel);
            room4.create_obj(this.shapes.barrel1, barrel_scale(Mat4.translation(7, 0.5, -2)), this.barrel);
            room4.create_obj(this.shapes.chain, Mat4.translation(7.625, 2, -6).times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);
            room4.create_obj(this.shapes.skull, Mat4.translation(7.5, 0.125, -6.5).times(Mat4.rotation(-Math.PI/2 - 0.2, 0, 1, 0)).times(Mat4.scale(1/8, 1/8, 1/8)), this.skull);

        }

        //Hallway

        {
            let hall = Room_Builder.create_room(Mat4.identity());

            hall.create_wall_x(0, 13.5, 15, 3, this.Wall);
            hall.create_wall_z(7.5, 10.5, 6, 3, this.Wall);

            hall.create_door_z(-7.5, 11.75, 3, 3, this.wood_door, (door)=>{
                if (!Item_System.player_holds(Item.Key)) {
                    Text_System.typewriter_animation(this.insight_text, "Door is locked");
                    return;
                }
                Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
                Item_System.destroy(Item_System.held_item);
                door.open = true;
            });

            hall.create_wall_z(-7, 27.5, 28, 3, this.Wall);

            hall.create_door_x(-9.25, 14, 4, 3, this.wood_door, (door)=>{
                if (!Item_System.player_holds(Item.Debug)) {
                    Text_System.typewriter_animation(this.insight_text, "Door is locked");
                    return;
                }
                Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
                Item_System.destroy(Item_System.held_item);
                door.open = true;
            });

            hall.create_wall_x(-17, 41.5, 20, 3, this.Wall);

            hall.create_door_z(-27, 40, 3, 3, this.wood_door, (door)=>{
                if (!Item_System.player_holds(Item.Key)) {
                    Text_System.typewriter_animation(this.insight_text, "Door is locked");
                    return;
                }
                Text_System.typewriter_animation(this.insight_text, "You Escaped");
                Item_System.destroy(Item_System.held_item);
                door.open = true;
            });

            hall.create_floor_ceil(0, 10.5, 15, 6, 3, this.Wall);
            hall.create_floor_ceil(-9, 26, 3.5, 31.5, 3, this.Wall);
            hall.create_floor_ceil(-19, 40, 16.5, 3, 3, this.Wall);

            hall.create_obj(this.shapes.cube, Mat4.translation(-7.375, 3, 11.75).times(Mat4.scale(0.124, 0.125, 1.9)), this.wood_door);
            hall.create_obj(this.shapes.cube, Mat4.translation(-7.375, 0, 11.75).times(Mat4.scale(0.124, 0.125, 1.9)), this.wood_door);

            hall.create_obj(this.shapes.cube, Mat4.translation(-10.5, 5, 10.5).times(Mat4.scale(0.25, 2, 3)), this.Wall);
            hall.create_obj(this.shapes.barrel1, Mat4.translation(-6, 0.5, 9).times(Mat4.scale(0.5, 0.5, 0.5)), this.barrel);
            hall.create_obj(this.shapes.barrel1, Mat4.translation(-5, 0.5, 8.5).times(Mat4.scale(0.5, 0.5, 0.5)), this.barrel);

        
        //     let room0 = Room_Builder.create_room(Mat4.translation(0, 0, 0));
        // room0.create_wall_z(8,9,5,3, this.Wall); 
        // room0.create_wall_x(2,11,14,3, this.Wall); 
        // room0.create_wall_z(-4.5,25.5,30,3, this.Wall); 
        // room0.create_wall_x(-13,38.5,100,3, this.Wall); 
        // room0.create_wall_x(-70,35.5,100,3, this.Wall); 

        hall.create_wall_z(3.5,1,0.5,4.5, this.Wall);
        hall.create_wall_z(3.5,4,0.5,4.5, this.Wall);
        hall.create_wall_z(-5,4,0.5,4.5, this.Wall);
        hall.create_wall_z(-5,1,0.5,4.5, this.Wall);

        // //room0.create_wall_z(-1.5,9.5,3,3, this.Wall); 
        // room0.create_door_z(-2,9.2,3,3, this.wood_door, (door) => {
        //     if (!Item_System.player_holds(Item.Key)) {
        //         Text_System.typewriter_animation(this.insight_text, "Door is locked");
        //         return;
        //     }
        //     door.open = true;
        //     Item_System.destroy(Item_System.held_item);
        //     Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
        // });
        // //room0.create_wall_z(-6,20,3,3, this.Wall);
        // room0.create_door_x(-6.2,20,3,3, this.wood_door, (door) => {
        //     if (!Item_System.player_holds(Item.Debug)) {
        //         Text_System.typewriter_animation(this.insight_text, "Door is locked");
        //         return;
        //     }
        //     door.open = true;
        //     Item_System.destroy(Item_System.held_item);
        //     Text_System.typewriter_animation(this.insight_text, "You unlocked the door");
        // });
        // //room0.create_wall_z(-23.5,37,3,3, this.Wall); 
        // room0.create_door_z(-23.5,37,3,3, this.wood_door, (door) => {
        //     if (!Item_System.player_holds(Item.Key)) {
        //         Text_System.typewriter_animation(this.insight_text, "Door is locked. ");
        //         return;
        //     }
        //     door.open = true;
        //     Item_System.destroy(Item_System.held_item);
        //     Text_System.typewriter_animation(this.insight_text, "You have escaped              ...");
        // });

        let trigger_mon = Mat4.translation(-35, 18, 37); // room0.create_wall_z(-9,37,1,1, this.Wall); 
        let end_trigger_mon = Mat4.translation(-6, 27, 34);


        // hall.create_trigger(end_trigger_mon, () => {
        //     if(monster_number == 0){
        //         monster_number++;                
        //     }

        // });
        // //room0.create_wall_z(-6,18,1,1, this.Wall);
        // room0.create_trigger(trigger_mon, () => {
        //     if(monster_number == 1){
        //         monster_number++;                
        //     }
        // });
        // }

        hall.create_obj(this.shapes.chain, Mat4.translation(4, 2, 7.8).times(Mat4.rotation(Math.PI, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);
        hall.create_obj(this.shapes.chain, Mat4.translation(-2, 3, 12.5).times(Mat4.rotation(Math.PI, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)), this.Chain);
        hall.create_obj(this.shapes.skeleton, Mat4.translation(3, 0.125, -2).times(Mat4.rotation(-Math.PI/2 + 0.5, 0, 1, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)).times(Mat4.scale(0.7, 0.7, 0.7)), this.skeleton);

        }

        // Text
        //Text_System.create_text("The string", scale, xpos, ypos) 0,0 is the center of screen. outputs the index of the text in the text_list array
        this.pickup_text = Text_System.create_text("", 1, -7, -15);
        this.insight_text = Text_System.create_text("", 0.7, -12, 20);
        this.objective_text = Text_System.create_text("Objective: Escape", 0.5, -70, 38);
    }

    make_control_panel() {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Controls";
        // The next line adds a live text readout of a data member of our Scene.
        // this.live_string(box => {
        //     box.textContent = (this.hover ? 0 : (this.t % (2 * Math.PI)).toFixed(2)) + " radians"
        // });
        // this.new_line();
        this.new_line();
        // Add buttons so the user can actively toggle data members of our Scene:
        this.key_triggered_button("Toggle_Light", ["f"], function () {
            this.hover ^= 1;
        });
        // this.new_line();
        // this.key_triggered_button("Bouncy", ["b"], function () {
        //     this.swarm ^= 1;
        // });
        this.new_line();
        this.key_triggered_button("Show Z-buffer depth map", ["l"], function () {
            this.shadowView ^= 1;
        });
        this.new_line();
        // this.key_triggered_button("Foward", ["Shift", "W"],
        //     () => this.control.w = true, '#6E6460', () => this.control.w = false);
        // this.key_triggered_button("Back",   ["Shift", "S"],
        //     () => this.control.s = true, '#6E6460', () => this.control.s = false);
        // this.key_triggered_button("Left",   ["Shift", "A"],
        //     () => this.control.a = true, '#6E6460', () => this.control.a = false);
        // this.key_triggered_button("Right",  ["Shift", "D"],
        //     () => this.control.d = true, '#6E6460', () => this.control.d = false);
        // this.key_triggered_button("Look_Right",  ["e"],
        //     () => this.control.e = true, '#6E6460', () => this.control.e = false);
        // this.key_triggered_button("Speed Up",  [" "],
        //     () => this.control.space = true, '#6E6460', () => this.control.space = false);
        //     this.new_line();
        //     this.key_triggered_button("Attach to object", ["1"], () => this.attached = () => this.moon);

        this.key_triggered_button("Interact", ["e"], this.on_interact, undefined);

    }

    on_interact() {
        // Called when interact button is pressed
        Item_System.pick_up_item();
        Interaction_System.interact();
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
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        let light_position = this.light_position;
        let light_color = this.light_color;
        let t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;
        let model_trans_floor = Mat4.translation(0, -0.1, 0).times(Mat4.scale(16 * 5, 0.1, 10 * 5));
        let model_trans_ceil = Mat4.translation(0, 6, 0).times(Mat4.scale(16 * 5, 0.1, 10 * 5));
        this.shapes.floor.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure);
        this.shapes.floor.draw(context, program_state, model_trans_ceil, shadow_pass? this.floor : this.pure);
        // if (draw_light_source && shadow_pass) {
        //     this.shapes.sphere.draw(context, program_state,
        //         Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(0.1,0.1,0.1)),
        //         this.light_src.override({color: light_color}));
        // }
/*
        for (let i of [-1, 1]) { // Spin the 3D model shapes as well.
            const model_transform = Mat4.translation(2 * i, 3, 0)
                .times(Mat4.rotation(t / 1000, -1, 2, 0))
                .times(Mat4.rotation(-Math.PI / 2, 0, 1, 0));
            this.shapes.table.draw(context, program_state, model_transform, shadow_pass? this.wood : this.pure);
        }

        let model_trans_floor = Mat4.translation(0, 0, 0).times(Mat4.scale(16 * 5, 0.1, 10 * 5));
        let model_trans_ceil = Mat4.translation(0, 8, 0).times(Mat4.scale(16 * 5, 0.1, 10 * 5));
        let model_trans_ball_0 = Mat4.translation(0, 1, 0);
        let model_trans_ball_1 = Mat4.translation(5, 0.5, 0);
        let model_trans_ball_2 = Mat4.translation(-5, 1.8, 0).times(Mat4.scale(0.5, 0.5, 0.5));
        
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


        this.shapes.table.draw(context, program_state, model_trans_ball_1, shadow_pass? this.wood : this.pure);
        this.shapes.skeleton.draw(context, program_state, model_trans_ball_2, shadow_pass? this.skeleton : this.pure);

        let model_trans_barrel_1 = Mat4.translation(-10, 1, 3);
        let model_trans_barrel_2 = Mat4.translation(-12, 1, 3);
        let model_trans_barrel_3 = Mat4.translation(-14, 1, 3);
        let model_trans_barrel_4 = Mat4.translation(-16, 1, 3);
        this.shapes.barrel1.draw(context, program_state, model_trans_barrel_1, shadow_pass? this.barrel : this.pure);
        this.shapes.barrel2.draw(context, program_state, model_trans_barrel_2, shadow_pass? this.barrel : this.pure);
        this.shapes.barrel3.draw(context, program_state, model_trans_barrel_3, shadow_pass? this.barrel : this.pure);
        this.shapes.barrel4.draw(context, program_state, model_trans_barrel_4, shadow_pass? this.barrel : this.pure);
        
        let model_trans_key_3 = Mat4.translation(0, 1, 3).times(Mat4.scale(0.4, 0.4, 0.4));
        this.shapes.key.draw(context, program_state, model_trans_key_3, shadow_pass? this.Key : this.pure);

        this.shapes.chain.draw(context, program_state, Mat4.translation(-4, 1, 8).times(Mat4.scale(0.8, 0.8, 0.8)), shadow_pass? this.Chain : this.pure);

        if (!open_teapot_door) {
            let door_transform = Mat4.translation(5, 1.5, 10).times(Mat4.scale(0.25, 3, 1));
            this.shapes.cube.draw(context, program_state, door_transform, shadow_pass ? this.wood_door : this.pure);
        }
*/

        //let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2]).
        //times(Mat4.scale(this.agent_size,this.agent_size,this.agent_size));
        //this.moon = agent_trans;
        // console.log("moon!!" + this.moon);
        //() => this.attached = () => this.agent_trans_;

        //this.agent.draw(context, program_state, agent_trans, shadow_pass? this.mon : this.pure);
        //this.agent_pos = program_state.camera_transform
        //console.log("cam trans");
        this.agent_pos = program_state.camera_transform.times(vec4(0, 0, 0, 1)).to3();

        //this.agent_body = new Body(this.agent.draw(context, program_state, agent_trans, shadow_pass? this.mon : this.pure));
    
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
   
        let base_transform = Mat4.identity().times(Mat4.scale(0.2,0.2,0.2).times(Mat4.translation(-2.5 + (0.01 + 0.01*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-1.5 + (0.1 + 0.01*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-5)));
        let base_transform_r = Mat4.identity().times(Mat4.scale(0.2,0.2,0.2).times(Mat4.translation(2.5 + (0.01 + 0.05*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-1.5 + (0.1 + 0.05*this.moving)*Math.sin(this.t/(900 - 700 * this.moving)),-5)));
        this.shapes.Flashlight.draw(context, program_state, program_state.camera_transform.times(base_transform_r), shadow_pass? this.flash : this.pure);
        
        let model_transform = Mat4.identity();
        //this.shapes.picture.draw(context, program_state, Mat4.translation(-2,2,0).times(Mat4.rotation(t/1000, 1,0,0)).times(model_transform), this.pic2);
        //this.shapes.picture.draw(context, program_state, model_trans_ball_4, this.pic);


        Item_System.draw_items(context, program_state, program_state.camera_transform.times(base_transform), shadow_pass);
        Room_Builder.draw(context, program_state, shadow_pass);

    //Gate Room

        //Walls

        let gr_wall1 = gate_room_base_transform.times(Mat4.translation(7.5, 1.5, 0)).times(Mat4.scale(0.25, 1.5, 7.5));
        let gr_wall2 = gr_wall1.times(Mat4.translation(-60, 0, 0));
        let gr_wall3 = gate_room_base_transform.times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.translation(7.5, 1.5, 0)).times(Mat4.scale(0.25, 1.5, 7.5));

        let gr_wall4 = gate_room_base_transform.times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.translation(-7.5, 1.5, -4.5)).times(Mat4.scale(0.25, 1.5, 3));
        let gr_wall5 = gr_wall4.times(Mat4.translation(0, 0, 3));

        let gr_wall6 = gr_wall4.times(Mat4.translation(40, 0, 0));
        let gr_wall7 = gr_wall5.times(Mat4.translation(40, 0, 0));

        this.shapes.cube.draw(context, program_state, gr_wall1, shadow_pass? this.Wall : this.pure);
        this.shapes.cube.draw(context, program_state, gr_wall2, shadow_pass? this.Wall : this.pure);
        this.shapes.cube.draw(context, program_state, gr_wall3, shadow_pass? this.Wall : this.pure);

        this.shapes.cube.draw(context, program_state, gr_wall4, shadow_pass? this.Wall : this.pure);
        this.shapes.cube.draw(context, program_state, gr_wall5, shadow_pass? this.Wall : this.pure);

        this.shapes.cube.draw(context, program_state, gr_wall6, shadow_pass? this.Wall : this.pure);
        this.shapes.cube.draw(context, program_state, gr_wall7, shadow_pass? this.Wall : this.pure);

        //Floor and Ceiling

        let gr_floor = gate_room_base_transform.times(Mat4.translation(0, 0, 0)).times(Mat4.scale(7.5, 0.01, 7.5));
        let gr_ceil = gr_floor.times(Mat4.translation(0, 300, 0));

        this.shapes.cube.draw(context, program_state, gr_floor, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, gr_ceil, shadow_pass? this.Wall : this.pure);

        //Gate

        if (!gate_open) {
            let gr_bar_transform = gate_room_base_transform.times(Mat4.translation(0, 1.5, -2.5)).times(Mat4.scale(0.025, 1.5, 0.025));

            for (let bar_pos = -1.125; bar_pos <= 1.125; bar_pos += 0.375) {
                this.shapes.cube.draw(context, program_state, gr_bar_transform.times(Mat4.translation(bar_pos * 40, 0, 0)), shadow_pass ? this.bar : this.pure);
            }
        }

        //Button

        let gr_button = gate_room_base_transform.times(Mat4.translation(-3.75, 0, 0)).times(Mat4.scale(0.5, 0.1, 0.5));

        this.shapes.cube.draw(context, program_state, gr_button, shadow_pass? this.Wall : this.pure);

        if (gate_open) {
            // let button_box = gate_room_base_transform.times(Mat4.translation(-3.75, 0.25, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0)).times(Mat4.scale(0.125, 0.125, 0.125));
            // this.shapes.cube.draw(context, program_state, button_box, shadow_pass? this.wood_door : this.pure);
            let button_box = gate_room_base_transform.times(Mat4.translation(-3.75, 0.25, 0)).times(Mat4.rotation(-Math.PI/2, 1, 0, 1)).times(Mat4.scale(0.2, 0.2, 0.2));
            this.shapes.skull.draw(context, program_state, button_box, shadow_pass? this.skull : this.pure);
        }

        //Table

        let gr_table = gate_room_base_transform.times(Mat4.translation(-3, 0, -5));
        this.shapes.table.draw(context, program_state, gr_table, shadow_pass? this.wood : this.pure);

        

        
// Room 3
        {
            // regular walls
            for (const [key, value] of Object.entries(this.room3)) {
                this.shapes.cube.draw(context, program_state, this.room3_parent.times(value), shadow_pass? this.Wall : this.pure);
            }
            const water = Mat4.translation(0, 0, 0).times(Mat4.scale(5, 0.1, 5)).times(Mat4.rotation(-3,1,0,0));
            const water_box = Mat4.translation(5, 0, 0).times(Mat4.scale(0.5, 0.2, 2));

            this.shapes.cube.draw(context, program_state, this.room3_parent.times(water), shadow_pass? this.water : this.pure);
            this.shapes.cube.draw(context, program_state, this.room3_parent.times(water_box), shadow_pass? this.Wall : this.pure);
            this.shapes.chain.draw(context, program_state, this.room3_parent.times( Mat4.translation(0, 1.5, 4.5)).times(Mat4.scale(0.8, 0.8, 0.8)).times(Mat4.rotation(-Math.PI/2,1,0,0)), shadow_pass? this.Chain : this.pure);
            this.shapes.skull.draw(context, program_state,this.room3_parent.times( Mat4.translation(0, 0.33, -4)).times(Mat4.scale(0.2, 0.2, 0.2)).times(Mat4.rotation(0.2*Math.PI/2,1,0,0)), shadow_pass? this.skull : this.pure);
            this.shapes.skull.draw(context, program_state,this.room3_parent.times( Mat4.translation(1.2, 0.33, -4)).times(Mat4.scale(0.2, 0.2, 0.2)).times(Mat4.rotation(0.23*Math.PI/2,1,0,0)), shadow_pass? this.skull : this.pure);
            this.shapes.skull.draw(context, program_state,this.room3_parent.times( Mat4.translation(2, 0.33, -4)).times(Mat4.scale(0.2, 0.2, 0.2)).times(Mat4.rotation(-Math.PI/2,1,0,0)), shadow_pass? this.skull : this.pure);
            this.shapes.barrel3.draw(context, program_state,this.room3_parent.times( Mat4.translation(-3.5, 1.1, -4)), shadow_pass? this.barrel : this.pure);
            this.shapes.barrel4.draw(context, program_state,this.room3_parent.times( Mat4.translation(-3.5, 1, 4)), shadow_pass? this.barrel : this.pure);
            this.shapes.skeleton.draw(context, program_state,this.room3_parent.times( Mat4.translation(-3.5, 2, 0)).times(Mat4.scale(0.9, 0.9, 0.9)).times(Mat4.rotation(Math.PI/2,0,1,0)), shadow_pass? this.skeleton : this.pure);
            this.shapes.chain.draw(context, program_state, this.room3_parent.times( Mat4.translation(-4.5, 2, 0)).times(Mat4.scale(0.8, 0.8, 0.8)).times(Mat4.rotation(Math.PI/2,0,1,0)).times(Mat4.rotation(-Math.PI/2,1,0,0)), shadow_pass? this.Chain : this.pure);
            this.shapes.table.draw(context, program_state, this.room3_parent.times( Mat4.translation(0, 0, 0)), shadow_pass? this.wood : this.pure);
            this.shapes.barrel1.draw(context, program_state,this.room3_parent.times( Mat4.translation(15, 1, 22)), shadow_pass? this.barrel : this.pure);
            this.shapes.table.draw(context, program_state,this.room3_parent.times( Mat4.translation(7, 0, 17)), shadow_pass? this.wood : this.pure);
            this.shapes.skull.draw(context, program_state,this.room3_parent.times( Mat4.translation(7, 1, 17)).times(Mat4.scale(0.2, 0.2, 0.2)).times(Mat4.rotation(1.9,0,1,0.1)), shadow_pass? this.skull : this.pure);
            //let t1 = program_state.animation_time;
            if(skull_drop && monster_trigger){
                this.shapes.monster.draw(context, program_state,this.room3_parent.times( Mat4.translation(8, 2, 15)).times(Mat4.scale(0.8 + 0.1*Math.sin(this.t/10), 0.8, 0.8)).times(Mat4.rotation(Math.PI,0,1,0)), shadow_pass? this.thing : this.pure);
            }else{
                // hide under the floor but still draw (for performance)
                this.shapes.monster.draw(context, program_state,this.room3_parent.times( Mat4.translation(8, -10, 15)).times(Mat4.scale(0.8 + 0.1*Math.sin(this.t/10), 0.8, 0.8)).times(Mat4.rotation(Math.PI,0,1,0)), shadow_pass? this.thing : this.pure);

            }
            /*
            if (!open_skull_door) {
                let door_transform = Mat4.translation(5, 1.5, 10).times(Mat4.scale(0.25, 3, 1));
                this.shapes.cube.draw(context, program_state, door_transform, shadow_pass ? this.wood_door : this.pure);
            }
            */
            /*
            if (!open_hall_door) {
                let door_transform = this.room3_parent.times(Mat4.translation(8, 1, 14)).times(Mat4.scale(1.5, 5, 0.25));
                this.shapes.cube.draw(context, program_state, door_transform, shadow_pass ? this.wood_door : this.pure);
            }*/
            // this.shapes.cube.draw(context, program_state, this.room3_parent.times(this.room3.wall1), shadow_pass? this.floor : this.pure);
            // this.shapes.cube.draw(context, program_state, this.room3_parent.times(this.room3.wall2), shadow_pass? this.floor : this.pure);
            // this.shapes.cube.draw(context, program_state, this.room3_parent.times(this.room3.wall3), shadow_pass? this.floor : this.pure);
        }

        //Jail Room
        {
            //Gates

            let shapes = this.shapes;
            let bar = this.bar;
            let pure = this.pure;
            function draw_bars(transform) {
                for (let bar_pos = -1.125; bar_pos <= 1.125; bar_pos += 0.375) {
                    shapes.cube.draw(context, program_state, transform.times(Mat4.translation(bar_pos, 0, 0)).times(Mat4.scale(0.025, 1.5, 0.025)), shadow_pass ? bar : pure);
                }
            }

            if (this.open_gate_index !== 0) {draw_bars(this.gate_transform_1)}
            if (this.open_gate_index !== 1) {draw_bars(this.gate_transform_2)}
            if (this.open_gate_index !== 2) {draw_bars(this.gate_transform_3)}
            if (this.open_gate_index !== 3) {draw_bars(this.gate_transform_4)}

            //Switch

            let switch_transform = this.room4_parent.times(this.switch_transform).times(Mat4.translation(0, 0.75, 0)).times(Mat4.rotation(Math.PI/3 - this.open_gate_index * 2 * Math.PI/9, 0, 0, 1)).times(Mat4.scale(1/32, 1/4, 1/32));
            this.shapes.cube.draw(context, program_state, switch_transform, shadow_pass ? this.wood_door : pure)

        }
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
                vec3(6, 1.9, 9),
                vec3(2, 1.9, 9),
                vec3(0, 1, 0)
            )); // Locate the camera here

            //Get mouse ray
            context.canvas.addEventListener("mousemove", e => {
                e.preventDefault();
                let r = context.canvas.getBoundingClientRect();
                let mouse_pos = vec4((2 * e.clientX - r.left - r.right) / (r.right - r.left),
                                     (2 * e.clientY - r.bottom - r.top) / (r.top - r.bottom), 1, 1);
                this.mouse_ray = Mat4.inverse(program_state.projection_transform).times(mouse_pos).to3().normalized();
            });
        }

        //context.convas.        document_element.innerHTML += "<h1>sample text!!</h1>";

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
        program_state.lights = [new Light(this.light_position, this.light_color, 0)];
        //if(Item_System.player_holds(Item.Flashlight)){
            if(!this.hover){
                program_state.lights = [new Light(this.light_position, this.light_color, 1000)];
            }else{
                program_state.lights = [new Light(this.light_position, this.light_color, 0)];
            }            
        //}


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
        Item_System.update_item_in_range(context, program_state, this.mouse_ray);
        Interaction_System.update_interact_in_range(program_state.camera_transform);

        if (Item_System.item_in_range != null){
            Text_System.update_text(this.pickup_text, "Pick up item");
        }else if  ((Interaction_System.interact_in_range) != null){
            Text_System.update_text(this.pickup_text, "  Interact  ");
        }else{
            Text_System.update_text(this.pickup_text, "");
        }
        
        Text_System.draw_text(context, program_state); // draw the text after all rendering
    }

    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:
        // //console.log("Hello world");
        if (Item_System.player_holds(Item.Debug)){
            skull_drop = true;
        }
   
        if (skull_drop){
            while (this.bodies.length < 20)
                this.bodies.push(new Body(this.shapes.skull, this.skull , vec3(0.3, 0.3, 0.3))
                    .emplace(this.room3_parent.times(Mat4.translation(...vec3(0, 15, 0).randomized(10))),
                        vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random() * 0.3));            
        }

        for (let b of this.bodies) {
            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * -9.8;
            // If about to fall through floor, reverse y velocity:
            if (b.center[1] < 0.5 && b.linear_velocity[1] < 0){
                b.linear_velocity[1] *= -.2;
                b.linear_velocity[0] *= .9;
                b.linear_velocity[2] *= .9;
            }

            // Simple Sphere Collision Implementation
            const adjusted_pos = vec3(this.agent_pos[0], this.agent_pos[1] - 1.9, this.agent_pos[2])
            let dis = b.center.minus(adjusted_pos);
            if (dis.norm() < this.agent_size) {
                b.linear_velocity.add_by(dis.times(dt * 98));
            }
        }


        // Delete bodies that stop or stray too far away:
        this.bodies = this.bodies.filter(b => b.center.norm() < 50 && (b.linear_velocity.norm() > 2 || b.center[1] > -8));
    }

    show_explanation(document_element) {
        document_element.innerHTML += "<h1>Castle of Shadows </h1>"
            + "</p><p>Justin Morgan, Richard Nguyen, and Abdulaziz Al Jaloud</p>";
    }
}


//***************************************Movement is now in ./first-person-controller.js */
//***************************************Shaders are now in ./shaders.js */
