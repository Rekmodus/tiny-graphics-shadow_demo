import {defs, tiny} from './examples/common.js';

const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Interaction_System {
    // Code is mostly copied from item-system.js, will probably make Item_System call this class in the future
    // instead

    interact_radius = 2;

    interactions = [];
    interact_in_range;

    constructor() {}

    create_interaction(transform, callback) {
        // Adds interactions to scene, should only be called at the start of the scene
        this.interactions.push(new Interaction_Point(transform, callback));
    }

    update_interact_in_range(camera_transform) {
        // Finds an interaction in interact range and stores it in interact_in_range, stores null if no
        // items are in range
        // Should be called every frame
        for (let i of this.interactions) {
            let pos = Mat4.inverse(camera_transform).times(i.transform.times(vec4(0, 0, 0, 1))).to3();
            if (pos.dot(pos) <= this.interact_radius * this.interact_radius) {
                this.interact_in_range = i;
                return;
            }
        }
        this.interact_in_range = null;
    }

    interact() {
        // Calls the associated callback for the interaction in range
        if (this.interact_in_range == null) {return}
        this.interact_in_range.callback(this.interact_in_range);
    }

    destroy(interaction) {
        // Removes an interaction from the scene
        if (interaction == null || this.interactions.length === 0) {return}

        let i = 0;
        for (; i < this.interactions.length && interaction !== this.interactions[i]; i++) {}

        this.interactions.splice(i, 1);
    }
}

class Interaction_Point {

    constructor(transform, callback) {
        Object.assign(this, {
            transform, callback
        });
    }
}