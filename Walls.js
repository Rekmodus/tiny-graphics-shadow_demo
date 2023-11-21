// This file is meant to keep track of all the collidable walls. 
// It is created to so it can separate from the first person controller and be accessed from other files.
// Maybe we can keep the entire level data here. Though, there may be certain walls/doors we want to access by name

import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

const gate_room_base_transform = Mat4.identity();

let walls = [];
/*
let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 3, 5)).times(Mat4.identity());
let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 8)).times(Mat4.identity());
let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 5, 0.33)).times(Mat4.identity());
let model_trans_wall_4 = Mat4.translation(0, 1, 0).times(Mat4.identity());

let door_transform = Mat4.translation(5, 1, 10).times(Mat4.scale(0.25, 2, 1));

walls.push(model_trans_wall_1);
walls.push(model_trans_wall_2);
walls.push(model_trans_wall_3);
walls.push(model_trans_wall_4);

walls.push(door_transform);
*/

//Gate Room Walls

const error = -0.375;

let gr_wall1 = gate_room_base_transform.times(Mat4.translation(7.5, 2, 0)).times(Mat4.scale(0.25, 1, 7.5));
let gr_wall2 = gr_wall1.times(Mat4.translation(-60, 0, 0));
let gr_wall3 = gate_room_base_transform.times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.translation(7.5, 2, 0)).times(Mat4.scale(0.25 + error, 1, 7.5));

let gr_wall4 = gate_room_base_transform.times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.translation(-7.5, 2, -4.5)).times(Mat4.scale(0.25 + error, 1, 3));
let gr_wall5 = gr_wall4.times(Mat4.translation(0, 0, 3));

let gr_wall6 = gate_room_base_transform.times(Mat4.rotation(Math.PI/2, 0, 1, 0)).times(Mat4.translation(2.5, 2, -4.5)).times(Mat4.scale(0.25 + error, 1, 3));
let gr_wall7 = gr_wall6.times(Mat4.translation(0, 0, 3));

let gr_gate = gate_room_base_transform.times(Mat4.translation(0, 1, -2.5)).times(Mat4.scale(3, 2, 0.25));

walls.push(gr_wall1);
walls.push(gr_wall2);
walls.push(gr_wall3);
walls.push(gr_wall4);
walls.push(gr_wall5);
walls.push(gr_wall6);
walls.push(gr_wall7);
walls.push(gr_gate);


// Room 3
const room3_parent = Mat4.translation(-25, 0, -5);
const room3_collision = {
    "wall_left": Mat4.translation(-5, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 5)),
    "wall_right1": Mat4.translation(+5, 2 - 0.1, 7).times(Mat4.scale(0.33, 5, 5)),
    "wall_right2": Mat4.translation(+5, 2 - 0.1, -7).times(Mat4.scale(0.33, 5, 5)),
    "wall_back": Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(5, 5, 0.33)),
    "wall_front": Mat4.translation(0, 2 - 0.1, +5).times(Mat4.scale(5, 5, 0.33)),
    "table": Mat4.translation(0, 0, 0).times(Mat4.scale(0.5, 0.5, 0.5)),
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
for (const [key, value] of Object.entries(room3_collision)) {
    walls.push(room3_parent.times(value));
}

export { walls};