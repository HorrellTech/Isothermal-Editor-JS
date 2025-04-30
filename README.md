# Isothermal-JS

## A Web-Based Game Creation Tool
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](https://www.javascript.com/)
[![HTML5](https://img.shields.io/badge/Platform-HTML5-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)

Isothermal-JS is a lightweight, browser-based game creation toolkit that lets you build 2D games with pure JavaScript - no compiling required! It's designed to be easy to learn while still providing powerful features for game development.

## 🎮 Features ( Some yet to be implemented )

- **All-in-one editor**: Code, test, and play your games within the browser
- **Object-oriented structure**: Create game objects with events and behaviors
- **Modular architecture**: Add functionality through specialized modules
  - Physics system with gravity, collision detection, and response
  - Platformer controller with customizable movement mechanics
  - Animation system for sprite sheet animations
  - Particle system for visual effects
  - Weather effects (rain, snow, fog, etc.)
  - Tilesets for building game worlds
  - Camera system with smooth tracking
  - Dialog system for NPC interactions
  - And more!
- **Level editor**: Visual level design tool with object placement
- **Resources manager**: Import and manage sprites, sounds, backgrounds, and data files
- **Project saving/loading**: Export your projects as ZIP files
- **HTML5 export**: Package finished games for web hosting

## 🚀 Getting Started

### Online Version

The easiest way to get started is to use the online version of Isothermal-JS:

[Launch Isothermal-JS Online](https://horrelltech.github.io/Isothermal-Editor-JS/)

### Local Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/Isothermal-JS/releases)
2. Extract the ZIP file to a location on your computer
3. Open `index.html` in a modern web browser (Chrome, Firefox, Edge recommended)

## 📖 Quick Tutorial

### Creating Your First Game Object

1. Click on the "Objects" tab
2. Click "Add Object"
3. Name your object (e.g., "objPlayer")
4. In the events panel, select the "awake" event
5. Add the following code:

```javascript
// Initialize player
this.width = 32;
this.height = 48;
this.color = c_blue;
this.speed = 4;

// Add physics module
const physics = this.module_add(create_physics_module());
physics.friction = 0.1;
```
## Adding Movement Logic
 1. Select the "loop" event
 2. Add the following code:

```javascript
// Get physics module
const physics = this.module_get("physics");
if (!physics) return;

// Handle movement input
let moveX = 0;
let moveY = 0;

if (keyboard_check(vk_left))  moveX = -1;
if (keyboard_check(vk_right)) moveX = 1;
if (keyboard_check(vk_up))    moveY = -1;
if (keyboard_check(vk_down))  moveY = 1;

// Apply movement
physics.vx = moveX * this.speed;
physics.vy = moveY * this.speed;
```

## Adding Drawing Code
 1. Select the "draw" event
 2. Add the following code:

 ```javascript
// Draw player
draw_set_color(this.color);
draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);
draw_set_color(c_white);
 ```

## Testing Your Game
 1. Click on the "Canvas" tab to view your game window
 2. Press the "Play" button to start your game
 3. Use arrow keys to move your blue rectangle around the screen

# 📚 Documentation

## Game Object Events
### Isothermal-JS provides several event functions for each game object:

 - **awake:** Called when object is first created, ideal for initialization
 - **loop_begin:** Called at the start of each frame
 - **loop:** Main update function, ideal for game logic
 - **loop_end:** Called at the end of each frame
 - **draw:** Where rendering code should go
 - **draw_gui:** For drawing UI elements that stay fixed on screen

## Module System
### Modules extend the functionality of game objects:

```javascript
// Add a physics module to an object
const physics = this.module_add(create_physics_module());

// Configure the module
physics.gravity = 0.5;
physics.friction = 0.1;

// Use the module in other events
const physics = this.module_get("physics");
if (physics) {
    physics.vx = 5; // Move right
}
```

## Available Modules
 - **create_physics_module():** Basic physics with velocity and collision
 - **create_platformer_module():** Platform movement controls
 - **create_animation_module():** Sprite sheet animations
 - **create_particle_system_module():** Particle effects
 - **create_tilemap_module():** Tile-based level creation
 - **create_camera_module():** Camera controls and effects
 - **create_dialog_module():** Text dialog system
 - **create_health_module():** Health and damage system
 - **create_inventory_module():** Basic inventory management
 - **create_weather_module():** Dynamic weather effects

 # 🛠️ Project Structure
 - **Game Objects:** Define behaviors and properties
 - **Folders:** Organize your game objects
 - **Levels:** Design game levels with object placement
 - **Resources:** Import and manage assets
 - **Sprites:** Visual elements for your game
 - **Backgrounds:** Larger images for scenery
 - **Sounds:** Audio files for music and sound effects
 - **Fonts:** Custom text styles
 - **Data:** JSON, CSV, or text files
 - **Scripts:** Write reusable code functions

