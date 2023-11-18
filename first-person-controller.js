import { Simulation } from './examples/control-demo.js';
import {defs, tiny} from './examples/common.js';
import {Body, Test_Data} from "./examples/collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {Vector, vec3, unsafe3, vec4, vec, color, hex_color,Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

import {Shape_From_File} from './examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'
import { walls } from './Walls.js';

export class Movement_Controls_2 extends Scene {
        // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other
        // scenes.  Rather than drawing anything it embeds both first-person and third-
        // person style controls into the website.  These can be used to manually move your
        // camera or other objects smoothly through your scene using key, mouse, and HTML
        // button controls to help you explore what's in it.
        constructor() {
            super();
            const data_members = {
                roll: 0, look_around_locked: false, fps_look: false,
                thrust: vec3(0, 0, 0), pos: vec3(0, 0, 0), z_axis: vec3(0, 0, 0),
                radians_per_frame: 1 / 200, meters_per_frame: 4, speed_multiplier: 0.5
            };
            Object.assign(this, data_members);

            this.mouse_enabled_canvases = new Set();
            this.will_take_over_graphics_state = true;

            // this.walls = [];
            // let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 3, 5)).times(Mat4.identity());
            // let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 5, 8)).times(Mat4.identity());
            // let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 5, 0.33)).times(Mat4.identity());
            // let model_trans_wall_4 = Mat4.translation(0, 1, 0).times(Mat4.identity());
          
            // this.walls.push(model_trans_wall_1);
            // this.walls.push(model_trans_wall_2);
            // this.walls.push(model_trans_wall_3);
            // this.walls.push(model_trans_wall_4);
            this.door1 = true
            // We can identify a wall using walls.includes. We could save more data for the walls if we want
            // if (this.walls.includes(model_trans_wall_3)){
            //     console.log("wall 3 exists");
            // }else{
            //     console.log("no wall");
            // }
            

            // Initialize variables to track accumulated mouse movement
            this.accumulatedMouseX = 0;
            this.accumulatedMouseY = 0;

            //this.first = true;     // initialize the center of mouse
            //this.accumulatedUpDownRotation = 0;
            //this.y_axis_rotation_matrix = Mat4.identity();
        }

        // Function to recenter the mouse
        recenterMouse(context) {
            // const center = [0, 0];
            this.accumulatedMouseX = 0;
            this.accumulatedMouseY = 0;

            // Reset the mouse position to the center
            context.canvas.requestPointerLock = context.canvas.requestPointerLock || context.canvas.mozRequestPointerLock;
            context.canvas.requestPointerLock();
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
                this.mouse.from_center = [this.mouse.from_center[0], this.mouse.from_center[1]];

                // e.movementX and e.movementY provide the change in mouse position
                this.accumulatedMouseX += e.movementX || e.mozMovementX || 0;
                this.accumulatedMouseY += e.movementY || e.mozMovementY || 0;

                // console.log("mousemove");
                // console.log(this.accumulatedMouseX);
                // console.log(this.accumulatedMouseY);

            });
            // canvas.addEventListener("mouseout", e => {
            //     if (!this.mouse.anchor) this.mouse.from_center.scale_by(0)
            // });
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
            // this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
            //     + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
            this.new_line();
            this.control_panel.innerHTML += "Move with wasd. Make sure to NOT have caps lock on.<br>";
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
                box.textContent = "Sensitivity: " + this.speed_multiplier.toFixed(2)
            }, speed_controls);
            this.key_triggered_button("+", ["p"], () =>
                this.speed_multiplier *= 1.2, undefined, undefined, undefined, speed_controls);
            this.new_line();
            //this.key_triggered_button("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
            //this.key_triggered_button("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
            //this.new_line();
            this.key_triggered_button("(Un)freeze mouse look around", ["g"], () => this.look_around_locked ^= 1, "#8B8885");
            this.new_line();
            this.key_triggered_button("Toggle FPS look around", ["0"], () => this.fps_look ^= 1, "#8B8885");
            this.new_line();
            this.key_triggered_button("Door", ["9"], () => this.door1 ^= 1, "#8B8885");
            this.new_line();
            // this.key_triggered_button("Go to world origin", ["r"], () => {
            //     this.matrix().set_identity(4, 4);
            //     this.inverse().set_identity(4, 4)
            // }, "#8B8885");
            //this.new_line();

            this.key_triggered_button("Look at origin from front", ["2"], () => {
                this.inverse().set(Mat4.look_at(vec3(0, 1.9, 10.1), vec3(0, 1.9, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            // this.new_line();ggg
            // this.key_triggered_button("from right", ["2"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            this.key_triggered_button("from rear", ["3"], () => {
                this.inverse().set(Mat4.look_at(vec3(0, 0, -10), vec3(0, 0, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            // this.key_triggered_button("from left", ["4"], () => {
            //     this.inverse().set(Mat4.look_at(vec3(-10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            //     this.matrix().set(Mat4.inverse(this.inverse()));
            // }, "#8B8885");
            //this.new_line();
            // this.key_triggered_button("Attach to global camera", ["Shift", "R"],
            //     () => {
            //         this.will_take_over_graphics_state = true
            //     }, "#8B8885");
            //this.new_line();
        }

        first_person_flyaround(radians_per_frame, meters_per_frame, leeway = 50) {
            // (Internal helper function)
            // Compare mouse's location to all four corners of a dead box:
            let offsets_from_dead_box = {
                plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
                minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
            };

            if (this.fps_look){
                offsets_from_dead_box = {
                    plus: [this.accumulatedMouseX, this.accumulatedMouseY],
                    minus: [this.accumulatedMouseX, this.accumulatedMouseY]
                };
            }
            // }else{
            //     offsets_from_dead_box = {
            //         plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
            //         minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
            //     };
            // }

            
            // Apply a camera rotation movement, but only when the mouse is
            // past a minimum distance (leeway) from the canvas's center:
            if (!this.look_around_locked){
                // If steering, steer according to "mouse_from_center" vector, but don't
                // start increasing until outside a leeway window from the center.
                // for (let i = 0; i < 2; i++) {                                     // The &&'s in the next line might zero the vectors out:
                //     let o = offsets_from_dead_box,
                //         velocity = ((o.minus[i] > 0 && o.minus[i]) || (o.plus[i] < 0 && o.plus[i])) * radians_per_frame;
                //     // On X step, rotate around Y axis, and vice versa.
                //     this.matrix().post_multiply(Mat4.rotation(-velocity, i, 1 - i, 0));
                //     this.inverse().pre_multiply(Mat4.rotation(+velocity, i, 1 - i, 0));
                // }

                const o = offsets_from_dead_box;
                
                // Rotation around the local x-axis (up and down)
                const up_down_velocity = ((o.minus[1] > 0 && o.minus[1]) || (o.plus[1] < 0 && o.plus[1])) * radians_per_frame;
                this.matrix().post_multiply(Mat4.rotation(-up_down_velocity, 1, 0, 0));
                this.inverse().pre_multiply(Mat4.rotation(+up_down_velocity, 1, 0, 0));

                const worldUpy = this.inverse().times(vec4(0, 1, 0, 0)).to3().normalized();
                if(worldUpy[1]<0.5){
                    //console.log("too far");
                                 // Rotation around the local x-axis (up and down)
                    //const up_down_velocity2 = ((o.minus[1] > 0 && o.minus[1]) || (o.plus[1] < 0 && o.plus[1])) * radians_per_frame *-1;
                    this.matrix().post_multiply(Mat4.rotation(+up_down_velocity, 1, 0, 0));
                    this.inverse().pre_multiply(Mat4.rotation(-up_down_velocity, 1, 0, 0));
                }
    
                // Rotation around an arbitrary axis (e.g., the world up vector)
                const left_right_velocity = ((o.minus[0] > 0 && o.minus[0]) || (o.plus[0] < 0 && o.plus[0])) * radians_per_frame;
    
                // rotate around the world up vector
                const rotation_axis = this.inverse().times(vec4(0, 1, 0, 0)).to3().normalized();
                const rotation_matrix = Mat4.rotation(-left_right_velocity, ...rotation_axis);
                const rotation_matrix2 = Mat4.rotation(left_right_velocity, ...rotation_axis);
    
                this.matrix().post_multiply(rotation_matrix);
                this.inverse().pre_multiply(rotation_matrix2);

            }

            // this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
            // this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));

            // Get the camera matrix
            const cameraMatrix = this.inverse();

            // Get the camera's up vector in world coordinates
            const worldUp = cameraMatrix.times(vec4(0, 1, 0, 0)).to3().normalized();

            // Project the movement vector onto the floor (perpendicular to the up vector)
            const localTranslation = this.thrust.times(-meters_per_frame);
            const localTranslation2 = this.thrust.times(+meters_per_frame);
            const projectedTranslation = localTranslation.minus(worldUp.times(localTranslation.dot(worldUp)));
            const projectedTranslation2 = localTranslation2.minus(worldUp.times(localTranslation2.dot(worldUp)));

            // Apply the projected translation to the camera matrix
            this.matrix().post_multiply(Mat4.translation(...projectedTranslation));
            this.inverse().pre_multiply(Mat4.translation(...projectedTranslation2));


            // const movementVector = this.thrust.times(-meters_per_frame);
            //console.log(movementVector);

            // Convert the local movement vector to world coordinates
            // const worldMovementVector = this.matrix().times(movementVector.to4(0)).to3();
            // console.log(worldMovementVector);
            // return worldMovementVector;
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

        
        check_wall_collisions(w, graphics_state, ){
            const playerSize = vec3(1.5, 1.5, 1.5); // Adjust the size of the player

            for (let i = 0; i < w.length; i++) {
                const playerPosition = graphics_state.camera_transform.times(vec4(0, 0, 0, 1)).to3();

                let wall = w[i];

                if(i == 3){
                    if (this.door1){
                        wall = Mat4.translation(0, 1, 0).times(Mat4.identity());
                    }else{
                        wall = Mat4.translation(2, 1, 0).times(Mat4.identity());
                    }
                }

                //const index = walls.indexOf(searchWall); // Returns the index of the first occurrence
                //const exists = walls.includes(searchWall); // Returns true if the element exists in the array
                

                const minExtent = wall.times(vec4(-1, -1, -1, 1.0)).to3();  // Assuming the center of the wall is at (0,0,0)
                const maxExtent = wall.times(vec4(1, 1, 1, 1.0)).to3();


                const adjustedMinExtent = minExtent.minus(playerSize.times(0.5));
                const adjustedMaxExtent = maxExtent.plus(playerSize.times(0.5));
                
                // console.log(i);
                // console.log(localPlayerPosition);
                // console.log(minExtent);
                // console.log(maxExtent);

                // Simple AABB collision
                if (
                    playerPosition[0] >= adjustedMinExtent[0] && playerPosition[0] <= adjustedMaxExtent[0] &&
                    playerPosition[2] >= adjustedMinExtent[2] && playerPosition[2] <= adjustedMaxExtent[2]
                ) {
                    // Collision detected with wall[i]
                    // Handle the collision (e.g., stop the player's movement)
                    console.log("Collision with wall " + i);
                    // trying to add sliding???
                    // // Decompose movement into parallel and perpendicular components
                    // const parallel_component = collision_normal.times(original_movement.dot(collision_normal));
                    // const perpendicular_component = original_movement.minus(parallel_component);

                    // // Adjust the parallel component based on sliding behavior (you can modify this)
                    // const sliding_factor = 0.5; // Adjust as needed
                    // const adjusted_parallel_component = parallel_component.times(sliding_factor);

                    // // Recombine components to get the adjusted movement
                    // return adjusted_parallel_component.plus(perpendicular_component);


                    return true;
                }
            }
            return false;
        }

        display(context, graphics_state, dt = graphics_state.animation_delta_time / 1000) {
            // The whole process of acting upon controls begins here.
            // const m = this.speed_multiplier * this.meters_per_frame,
            //     r = this.speed_multiplier * this.radians_per_frame;
            const m = this.meters_per_frame,
                r = (this.speed_multiplier + 8 * this.fps_look) * this.radians_per_frame ;

            if (this.will_take_over_graphics_state) {
                this.reset(graphics_state);
                this.will_take_over_graphics_state = false;
            }

            if (!this.mouse_enabled_canvases.has(context.canvas)) {
                this.add_mouse_controls(context.canvas);
                this.mouse_enabled_canvases.add(context.canvas)
            }

            // console.log("mouse");
            // console.log(this.mouse.from_center);
            // console.log("mouse move in display");
            // console.log(this.accumulatedMouseX);
            // console.log(this.accumulatedMouseY);
            // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
            //const movement_vector = this.first_person_flyaround(dt * r, dt * m);
            this.first_person_flyaround(dt * r, dt * m);
            // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
            if (this.mouse.anchor)
                this.third_person_arcball(dt * r);
            // Log some values:
            //console.log("pos");
            //console.log(movement_vector);
            this.pos = this.inverse().times(vec4(0, 0, 0, 1));
            this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));
            //console.log("cam pos?" + this.pos);
            //console.log("cam z?" + this.z_axis);

            // Try to move player. If collide then move player back!
            if (this.check_wall_collisions(walls, graphics_state)){
                // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
                this.first_person_flyaround(0, dt * m * -1);
            }

            // this.mouse.from_center = vec(0, 0);

            // After using mouse position, recenter the mouse
            // const center = [context.canvas.width / 2, context.canvas.height / 2];
            // this.mouse.from_center = vec(this.mouse.from_center[0] - center[0], this.mouse.from_center[1] - center[1]);

            // // // Recenter the mouse in the canvas
            // context.canvas.requestPointerLock = context.canvas.requestPointerLock || context.canvas.mozRequestPointerLock;
            // context.canvas.requestPointerLock();
            //console.log("first " + this.first);
            if (this.fps_look){
                this.recenterMouse(context);    
                         
            }


        }
    }