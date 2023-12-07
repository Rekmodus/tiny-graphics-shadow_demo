import {defs, tiny} from './examples/common.js';
import {Text_Line} from './examples/text-demo.js'

const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;


let text_pos = Mat4.identity().times(Mat4.scale(.01,.01,.01).times(Mat4.translation(0, 0, -50))); // The text is located in 3d space
let texture = new defs.Textured_Phong(1);
// To show text you need a Material like this one:
let text_image = new Material(texture, {
    ambient: 1, diffusivity: 0, specularity: 0,
    texture: new Texture("assets/text.png")
});

let type_speed = 1/100;

export class Text_System {
    // Handles text
    
    static text_list = [];

    static create_text(string="", scale=0.5, x=0, y=0, timer=-1, animation="none") {
        // Adds items to scene, should only be called at the start of the scene
        // Returns the item added
        const text_line = new Text_Line(35); // 35 character line
        let text_transform = text_pos.times(Mat4.scale(scale,scale,scale)).times(Mat4.translation(x,y,0));
        let text = new text_object(string, text_line, text_transform, text_image, timer);
        this.text_list.push(text);
        return this.text_list.length - 1; //return the index of the included object?
    }

    static draw_text(context, program_state) {
        // Draws all text, should be called AFTER rendering passes
        const t = program_state.animation_time;
        for (let i of this.text_list) {
            if (i.timer == 0){
                i.timer = program_state.animation_time;
                console.log("start anim");  

            }
            const at = i.timer;
            if (i.animation == "typewriter"){
                if (Math.floor((t - at)*type_speed) >= i.string.length + 10){
                    i.animation = "none";
                    i.timer = -1;
                    i.update_text("");
                }else{
                    i.model.set_string(i.string.substring(0, Math.floor((t - at)*type_speed)), context.context);
                    console.log("typewriter: " + (t-at) + " length: " + i.string.length + "index" + Math.floor((t - at)*type_speed))                    
                }
            }else{
                i.model.set_string(i.string, context.context);
            }
            
            i.model.draw(context, program_state, program_state.camera_transform.times(i.transform), text_image);
        }
    }

    static update_text(my_text, string){
        if (this.text_list[my_text].string == string){ return;}
        this.text_list[my_text].update_text(string);
    }
    
    static typewriter_animation(my_text, string){
        if(this.text_list[my_text].timer == -1){
            this.text_list[my_text].animation = "typewriter";
            this.text_list[my_text].timer = 0;
            this.text_list[my_text].update_text(string);            
        }

    }

}

export class text_object {

    constructor(string, model, transform, material, timer, animation) {
        Object.assign(this, {
            string, model, transform, material, timer, animation
        });
    }

    update_text(new_text){
        this.string = new_text;
        console.log("new text:" + new_text);
    }

}