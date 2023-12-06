import {defs, tiny} from './examples/common.js';
import { walls, _triggers, _doors } from './Walls.js';
//import {Shape_From_File} from './examples/obj-file-demo.js';
import {Color_Phong_Shader} from './examples/shadow-demo-shaders.js';
import {Item_System} from './item-system.js';
import {Interaction_System} from './interaction-system.js';

const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

let shapes = {
    "cube": new Cube(),
};

let pure = new Material(new Color_Phong_Shader(), {});

let wall_height = 3;
let wall_width = 0.25;
let door_width = 0.2;

export class Room_Builder {
    //Manages creation and drawing of rooms

    static draw(context, program_state, shadow_pass) {
        //Draws every room, call once during regular and shadow pass
        for (let i of this.rooms) { i.draw(context, program_state, shadow_pass); }
    }

    static rooms = []

    static create_room(transform) {
        //Creates a room.
        //Note: Do not use the constructor for Room, use this func instead
        this.rooms.push(new Room(transform));
        return this.rooms[this.rooms.length - 1];
    }
}

export class Room {
    //Groups together a set of objects and parents them to a given transform

    constructor(transform) {
        Object.assign(this, {transform});
    }



    draw(context, program_state, shadow_pass) {
        //Draws the room
        function _draw(model, transform, material) {
            model.draw(context, program_state, transform, shadow_pass ? material : pure);
        }

        for (let i of this.walls) {
            _draw(i.model, i.transform, i.material);
        }
        for (let i of this.floor_ceils) {
            _draw(i.model, i.transform.times(Mat4.scale(1, 0.01,1)), i.material);
            _draw(i.model, i.transform.times(Mat4.translation(0, i.height, 0)).times(Mat4.scale(1, 0.01,1)), i.material);
        }
        for (let i of this.objs) {
            _draw(i.model, i.transform, i.material);
        }
        for (let i of this.doors) {
            if (i.open) {continue;}
            _draw(shapes.cube, i.transform, i.material);
        }
    }

    walls = []
    floor_ceils = []
    objs = []
    doors = []

    create_wall_x(xPos, zPos, length, height, material) {
        //Creates a wall aligned with the x-axis
        let transform = Mat4.translation(xPos, height/2, zPos).times(Mat4.scale(length/2, height/2, wall_width));
        transform = this.transform.times(transform);

        this.walls.push(new Wall(transform, material, length/2, height/2, wall_width));
        walls.push(transform);
    }

    create_wall_z(xPos, zPos, length, height, material) {
        //Creates a wall aligned with the z-axis
        let transform = Mat4.translation(xPos, height/2, zPos).times(Mat4.scale(wall_width, height/2, length/2));
        transform = this.transform.times(transform);

        this.walls.push(new Wall(transform, material, wall_width, height/2, length/2));
        walls.push(transform);
    }

    create_floor_ceil(xPos, zPos, xScale, zScale, height, material) {
        //Creates a rectangular floor and the ceiling above it
        //Height is the distance between floor and ceiling
        let transform = Mat4.translation(xPos, 0, zPos).times(Mat4.scale(xScale/2, 1, zScale/2));
        transform = this.transform.times(transform);

        this.floor_ceils.push(new Floor_Ceil(transform, height, material, xScale/2, 1, zScale/2));
    }

    create_obj(model, transform, material) {
        transform = this.transform.times(transform);
        this.objs.push(new Obj(model, transform, material));
    }

    create_item(itemID, model, transform, material) {
        transform = this.transform.times(transform);
        Item_System.create_item(itemID, model, transform, material);
    }

    create_interaction(transform, callback) {
        //Use only for static objects
        //If object needs to move, render it in display as normal
        transform = this.transform.times(transform);
        Interaction_System.create_interaction(transform, callback);
    }

    create_door_x(xPos, zPos, length, height, material, callback) {
        let transform = Mat4.translation(xPos, height/2, zPos).times(Mat4.scale(length/2, height/2, door_width));
        transform = this.transform.times(transform);

        let door = new Door(transform, material);
        this.doors.push(door);
        _doors.push(door);

        Interaction_System.create_interaction(transform, (interaction) => {
            callback(door);
            if(door.open) {Interaction_System.destroy(interaction);}
        });
    }

    create_door_z(xPos, zPos, length, height, material, callback) {
        let transform = Mat4.translation(xPos, height/2, zPos).times(Mat4.scale(door_width, height/2, length/2));
        transform = this.transform.times(transform);

        let door = new Door(transform, material);
        this.doors.push(door);
        _doors.push(door);

        Interaction_System.create_interaction(transform, (interaction) => {
            callback(door);
            if(door.open) {Interaction_System.destroy(interaction);}
        });
    }

    create_trigger(transform, callback) {
        _triggers.push(new Trigger(this.transform.times(transform), callback));
    }
}

class Wall {
    constructor(transform, material, xScale, yScale, zScale) {
        Object.assign(this, {transform, material});

        //0 - bottom
        //1 - top
        //2 - -x
        //3 - +x
        //4 - +z
        //5 - -z

        this.model = new Cube();
        this.model.arrays.texture_coord = [
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, zScale), Vector.of(xScale, zScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, zScale), Vector.of(xScale, zScale),
            Vector.of(0, 0), Vector.of(zScale, 0), Vector.of(0, yScale), Vector.of(zScale, yScale),
            Vector.of(0, 0), Vector.of(zScale, 0), Vector.of(0, yScale), Vector.of(zScale, yScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, yScale), Vector.of(xScale, yScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, yScale), Vector.of(xScale, yScale)
        ];
    }
}

class Floor_Ceil {
    constructor(transform, height, material, xScale, yScale, zScale) {
        Object.assign(this, {transform, height, material});

        this.model = new Cube();
        this.model.arrays.texture_coord = [
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, zScale), Vector.of(xScale, zScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, zScale), Vector.of(xScale, zScale),
            Vector.of(0, 0), Vector.of(zScale, 0), Vector.of(0, yScale), Vector.of(zScale, yScale),
            Vector.of(0, 0), Vector.of(zScale, 0), Vector.of(0, yScale), Vector.of(zScale, yScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, yScale), Vector.of(xScale, yScale),
            Vector.of(0, 0), Vector.of(xScale, 0), Vector.of(0, yScale), Vector.of(xScale, yScale)
        ];
    }
}

class Obj {
    constructor(model, transform, material) {
        Object.assign(this, {model, transform, material});
    }
}

class Door {
    open = false;
    constructor(transform, material) {
        Object.assign(this, {transform, material});
    }
}

class Trigger {
    constructor(transform, callback) {
        Object.assign(this, {transform, callback});
    }
}