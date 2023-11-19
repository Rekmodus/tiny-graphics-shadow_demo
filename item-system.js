import {defs, tiny} from './examples/common.js';
import {Color_Phong_Shader} from './examples/shadow-demo-shaders.js';

const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Item_System {
    // An Item_System class should be created at the beginning of the scene

    world_item_scale = 0.25;
    pickup_radius = 2;

    constructor() {
        this.pure = new Material(new Color_Phong_Shader(), {});
    }

    item_list = [];
    item_in_range;
    held_item;

    create_item(itemID, model, transform, material) {
        // Adds items to scene, should only be called at the start of the scene
        // Returns the item added
        this.item_list.push(new Item(itemID, model, transform, material));
        return this.item_list[this.item_list.length - 1];
    }

    draw_items(context, program_state, hand_transform, shadow_pass) {
        // Draws all items, should be called during rendering passes
        // hand_transform is the transform needed to make the object appear to be held (i.e. the flashlight's transform)
        // shadow_pass indicates whether the object should use it's usual material or pure
        for (let i of this.item_list) {
            let transform = (i === this.held_item) ? hand_transform : i.transform.times(Mat4.scale(this.world_item_scale, this.world_item_scale, this.world_item_scale));
            i.model.draw(context, program_state, transform, shadow_pass? i.material : this.pure);
        }
    }

    update_item_in_range(camera_transform) {
        // Finds an item in pickup range and stores it in item_in_range, stores null if no items are in range
        // Should be called every frame
        for (let i of this.item_list) {
            let itemPos = Mat4.inverse(camera_transform).times(i.transform.times(vec4(0, 0, 0, 1))).to3();
            if (i !== this.held_item && itemPos.dot(itemPos) <= this.pickup_radius * this.pickup_radius) {
                this.item_in_range = i;
                return;
            }
        }
        this.item_in_range = null;
    }

    pick_up_item() {
        // Swaps the currently held item with item_in_range
        // Currently called by the on_interact method in test.js
        if (this.item_in_range == null) {return}

        if (this.held_item != null) {this.held_item.transform = this.item_in_range.transform;}
        this.held_item = this.item_in_range;
    }

    player_holds(itemID) {
        // Checks if the player holds an item of a specific type
        return this.held_item.ID === itemID;
    }
}

export class Item {

    // Item ID Numbers
    // These are used to identify different types of items
    // Item ID can be checked with the player_holds method in Item_System
    Debug = 0;
    Flashlight = 1;
    Key = 2;
    Skull = 3;

    constructor(ID, model, transform, material) {
        Object.assign(this, {
            ID, model, transform, material
        });
    }
}