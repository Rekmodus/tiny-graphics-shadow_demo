// This file is meant to keep track of all the collidable walls. 
// It is created to so it can separate from the first person controller and be accessed from other files.
// Maybe we can keep the entire level data here. Though, there may be certain walls/doors we want to access by name

import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

let walls = [];
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

export { walls};