import {defs, tiny} from './examples/common.js';
import {Color_Phong_Shader} from './examples/shadow-demo-shaders.js';

const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Item_System {
    // Handles item creation, and picking

    static world_item_scale = 0.25;
    static player_pickup_radius = 3; //Radius around player in which they can pick up items
    static item_radius = 0.25; //Radius around item which cursor must be inside to pick it up

    static pure = new Material(new Color_Phong_Shader(), {});

    static item_list = [];
    static item_in_range;
    static held_item;

    static create_item(itemID, model, transform, material) {
        // Adds items to scene, should only be called at the start of the scene
        // Returns the item added
        let item = new Item(itemID, model, transform, material);
        this.item_list.push(item);
        return this.item_list[this.item_list.length - 1];
    }

    static draw_items(context, program_state, hand_transform, shadow_pass) {
        // Draws all items, should be called during rendering passes
        // hand_transform is the transform needed to make the object appear to be held (i.e. the flashlight's transform)
        // shadow_pass indicates whether the object should use it's usual material or pure
        for (let i of this.item_list) {
            let transform = (i === this.held_item) ? hand_transform : i.transform.times(Mat4.scale(this.world_item_scale, this.world_item_scale, this.world_item_scale));
            i.model.draw(context, program_state, transform, shadow_pass? i.material : this.pure);
        }
    }

    static update_item_in_range(context, program_state, mouse_ray) {
        // Finds an item in pickup range and stores it in item_in_range, stores null if no items are in range
        // Should be called every frame
        for (let i of this.item_list) {
            let itemPos = Mat4.inverse(program_state.camera_transform).times(i.transform.times(vec4(0, 0, 0, 1))).to3();
            if (i === this.held_item || itemPos.dot(itemPos) > this.player_pickup_radius * this.player_pickup_radius)
                continue;

            let dist_vec = mouse_ray.times(itemPos.dot(mouse_ray)).minus(itemPos);
            if (itemPos.dot(mouse_ray) > 0 && dist_vec.dot(dist_vec) <= this.item_radius * this.item_radius) {
                this.item_in_range = i;
                return;
            }
        }
        this.item_in_range = null;
    }

    static pick_up_item() {
        // Swaps the currently held item with item_in_range
        // Currently called by the on_interact method in test.js
        if (this.item_in_range == null) {return}

        if (this.held_item != null) {this.held_item.transform = this.item_in_range.transform;}
        this.held_item = this.item_in_range;
    }

    static player_holds(itemID) {
        // Checks if the player holds an item of a specific type
        if (this.held_item == null) {return false;}
        return this.held_item.ID === itemID;
    }

    static destroy(item) {
        // Removes an item from the scene
        if (item == null || this.item_list.length === 0) {return}

        let i = 0;
        for (; i < this.item_list.length && item !== this.item_list[i]; i++) {}

        if (item === this.held_item) {this.held_item = null}
        this.item_list.splice(i, 1);
    }
}

export class Item {

    // Item ID Numbers
    // These are used to identify different types of items
    // Item ID can be checked with the player_holds method in Item_System
    static Debug= 0;
    static Flashlight = 1;
    static Key = 2;
    static Box = 3;

    constructor(ID, model, transform, material) {
        Object.assign(this, {
            ID, model, transform, material
        });
    }
}