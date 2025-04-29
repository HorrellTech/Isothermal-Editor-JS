/**
 * Game Engine Keywords and Function Documentation
 * Used for code hints and autocomplete functionality
 */

const engineKeywords = [
  // Object Lifecycle Functions
  {
    name: 'awake',
    type: 'function',
    description: 'Called once when an instance is created. Use this to initialize object-specific variables.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.awake = function() {\n  this.health = 100;\n  this.speed = 5;\n  this.score = 0;\n}'
  },
  {
    name: 'loop',
    type: 'function',
    description: 'Main update function called every frame. Use for game logic and object behavior.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.loop = function() {\n  if(keyboard_check(65)) {\n    this.x -= this.speed;\n  }\n}'
  },
  {
    name: 'loop_begin',
    type: 'function',
    description: 'Called at the start of each frame before the main loop function.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.loop_begin = function() {\n  this.prev_health = this.health;\n}'
  },
  {
    name: 'loop_end',
    type: 'function',
    description: 'Called at the end of each frame after the main loop function.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.loop_end = function() {\n  if(this.health < this.prev_health) {\n    // Player took damage this frame\n  }\n}'
  },
  {
    name: 'draw',
    type: 'function',
    description: 'Called each frame to render the object. Define how the object looks here.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.draw = function() {\n  draw_set_color(c_blue);\n  draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);\n}'
  },
  {
    name: 'draw_gui',
    type: 'function',
    description: 'Called each frame to render GUI elements. Use for HUD, score displays, etc.',
    parameters: [],
    returns: 'void',
    example: 'playerObj.draw_gui = function() {\n  draw_set_color(c_white);\n  draw_text(10, 10, "Score: " + this.score);\n}'
  },
  
  // Object Creation Functions
  {
    name: 'object_add',
    type: 'function',
    description: 'Creates a new game object type that can be instantiated later.',
    parameters: [],
    returns: 'object',
    example: 'const playerObj = object_add();\n\nplayerObj.awake = function() {\n  this.speed = 5;\n}'
  },
  {
    name: 'instance_create',
    type: 'function',
    description: 'Creates an instance of a game object at the specified position.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position to create the instance' },
      { name: 'y', type: 'number', description: 'Y position to create the instance' },
      { name: 'object', type: 'object', description: 'Object type to instantiate' }
    ],
    returns: 'object',
    example: 'const enemy = instance_create(100, 200, enemyObj);'
  },
  {
    name: 'instance_destroy',
    type: 'function',
    description: 'Marks the object for destruction, removing it from the game.',
    parameters: [],
    returns: 'void',
    example: 'if(this.health <= 0) {\n  this.instance_destroy();\n}'
  },
  
  // Drawing Functions
  {
    name: 'draw_set_color',
    type: 'function',
    description: 'Sets the color for subsequent drawing operations.',
    parameters: [
      { name: 'color', type: 'string', description: 'Color to use (e.g. c_red, c_blue)' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_red);\ndraw_rectangle(10, 10, 50, 50, false);'
  },
  {
    name: 'draw_set_alpha',
    type: 'function',
    description: 'Sets the transparency for subsequent drawing operations.',
    parameters: [
      { name: 'alpha', type: 'number', description: 'Alpha value between 0.0 (transparent) and 1.0 (opaque)' }
    ],
    returns: 'void',
    example: 'draw_set_alpha(0.5);\ndraw_rectangle(10, 10, 50, 50, false);'
  },
  {
    name: 'draw_set_font',
    type: 'function',
    description: 'Sets the font size and family for text drawing.',
    parameters: [
      { name: 'size', type: 'number', description: 'Font size in pixels' },
      { name: 'name', type: 'string', description: 'Font family name' }
    ],
    returns: 'void',
    example: 'draw_set_font(24, "Arial");\ndraw_text(10, 10, "Game Over");'
  },
  {
    name: 'draw_set_align',
    type: 'function',
    description: 'Sets the text alignment for subsequent text drawing.',
    parameters: [
      { name: 'align', type: 'string', description: 'Alignment (left, center, right)' }
    ],
    returns: 'void',
    example: 'draw_set_align("center");\ndraw_text(room_width/2, 20, "Score: " + score);'
  },
  {
    name: 'draw_text',
    type: 'function',
    description: 'Draws text at the specified position.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position to draw the text' },
      { name: 'y', type: 'number', description: 'Y position to draw the text' },
      { name: 'text', type: 'string', description: 'The text to draw' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_white);\ndraw_text(10, 10, "Score: " + score);'
  },
  {
    name: 'draw_rectangle',
    type: 'function',
    description: 'Draws a rectangle with the specified coordinates.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the top-left corner' },
      { name: 'y1', type: 'number', description: 'Y position of the top-left corner' },
      { name: 'x2', type: 'number', description: 'X position of the bottom-right corner' },
      { name: 'y2', type: 'number', description: 'Y position of the bottom-right corner' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled rectangle' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_blue);\ndraw_rectangle(this.x, this.y, this.x + 50, this.y + 50, false);'
  },
  
  // Math Utility Functions
  {
    name: 'point_distance',
    type: 'function',
    description: 'Calculates the distance between two points.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the first point' },
      { name: 'y1', type: 'number', description: 'Y position of the first point' },
      { name: 'x2', type: 'number', description: 'X position of the second point' },
      { name: 'y2', type: 'number', description: 'Y position of the second point' }
    ],
    returns: 'number',
    example: 'const dist = point_distance(player.x, player.y, enemy.x, enemy.y);\nif(dist < 100) {\n  // Enemy is close to player\n}'
  },
  {
    name: 'point_direction',
    type: 'function',
    description: 'Calculates the direction (angle in degrees) from one point to another.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the first point' },
      { name: 'y1', type: 'number', description: 'Y position of the first point' },
      { name: 'x2', type: 'number', description: 'X position of the second point' },
      { name: 'y2', type: 'number', description: 'Y position of the second point' }
    ],
    returns: 'number',
    example: 'const dir = point_direction(this.x, this.y, mouse_x, mouse_y);\nthis.motion_set(dir, 5);'
  },
  {
    name: 'lengthdir_x',
    type: 'function',
    description: 'Returns the horizontal component of a vector with the given length and direction.',
    parameters: [
      { name: 'length', type: 'number', description: 'Length of the vector' },
      { name: 'direction', type: 'number', description: 'Direction in degrees' }
    ],
    returns: 'number',
    example: 'const bulletSpeed = 10;\nconst xSpeed = lengthdir_x(bulletSpeed, this.direction);'
  },
  {
    name: 'lengthdir_y',
    type: 'function',
    description: 'Returns the vertical component of a vector with the given length and direction.',
    parameters: [
      { name: 'length', type: 'number', description: 'Length of the vector' },
      { name: 'direction', type: 'number', description: 'Direction in degrees' }
    ],
    returns: 'number',
    example: 'const bulletSpeed = 10;\nconst ySpeed = lengthdir_y(bulletSpeed, this.direction);'
  },
  {
    name: 'floor',
    type: 'function',
    description: 'Returns the largest integer less than or equal to the given number.',
    parameters: [
      { name: 'x', type: 'number', description: 'The number to floor' }
    ],
    returns: 'number',
    example: 'const gridX = floor(this.x / gridSize);'
  },
  {
    name: 'ceil',
    type: 'function',
    description: 'Returns the smallest integer greater than or equal to the given number.',
    parameters: [
      { name: 'x', type: 'number', description: 'The number to ceil' }
    ],
    returns: 'number',
    example: 'const requiredItems = ceil(totalCost / itemValue);'
  },
  {
    name: 'round',
    type: 'function',
    description: 'Rounds a number to the nearest integer.',
    parameters: [
      { name: 'x', type: 'number', description: 'The number to round' }
    ],
    returns: 'number',
    example: 'const displayHealth = round(this.health);'
  },
  {
    name: 'clamp',
    type: 'function',
    description: 'Constrains a value between a minimum and maximum value.',
    parameters: [
      { name: 'value', type: 'number', description: 'The value to constrain' },
      { name: 'min', type: 'number', description: 'The minimum allowed value' },
      { name: 'max', type: 'number', description: 'The maximum allowed value' }
    ],
    returns: 'number',
    example: 'this.x = clamp(this.x, 0, room_width - this.width);'
  },
  {
    name: 'keyboard_check',
    type: 'function',
    description: 'Checks if a key is currently being pressed.',
    parameters: [
      { name: 'key', type: 'number', description: 'The key code to check' }
    ],
    returns: 'boolean',
    example: 'if(keyboard_check(65)) { // "A" key\n  this.x -= 5;\n}'
  },
  
  // Object Methods
  {
    name: 'checkCollision',
    type: 'function',
    description: 'Checks if this object is colliding with another object.',
    parameters: [
      { name: 'other', type: 'object', description: 'The other object to check collision with' }
    ],
    returns: 'boolean',
    example: 'if(this.checkCollision(enemy)) {\n  this.health -= 10;\n}'
  },
  {
    name: 'motion_set',
    type: 'function',
    description: 'Sets the direction and speed of an object.',
    parameters: [
      { name: 'direction', type: 'number', description: 'The direction in degrees' },
      { name: 'speed', type: 'number', description: 'The speed value' }
    ],
    returns: 'void',
    example: 'this.motion_set(90, 5); // Move upward at speed 5'
  },
  {
    name: 'motion_add',
    type: 'function',
    description: 'Adds the given speed in the specified direction.',
    parameters: [
      { name: 'direction', type: 'number', description: 'The direction in degrees' },
      { name: 'speed', type: 'number', description: 'The speed to add' }
    ],
    returns: 'void',
    example: 'this.motion_add(270, 0.5); // Add gravity'
  },
  
  // Game Global Variables
  {
    name: 'room_width',
    type: 'variable',
    description: 'The width of the game room.',
    example: 'if(this.x > room_width) {\n  this.x = 0;\n}'
  },
  {
    name: 'room_height',
    type: 'variable',
    description: 'The height of the game room.',
    example: 'if(this.y > room_height) {\n  this.y = 0;\n}'
  },
  {
    name: 'mouse_x',
    type: 'variable',
    description: 'Current X position of the mouse in game coordinates.',
    example: 'const dir = point_direction(this.x, this.y, mouse_x, mouse_y);'
  },
  {
    name: 'mouse_y',
    type: 'variable',
    description: 'Current Y position of the mouse in game coordinates.',
    example: 'const dir = point_direction(this.x, this.y, mouse_x, mouse_y);'
  },
  
  // Object Properties
  {
    name: 'x',
    type: 'property',
    description: 'The X position of the object.',
    example: 'this.x += this.speed;'
  },
  {
    name: 'y',
    type: 'property',
    description: 'The Y position of the object.',
    example: 'this.y += this.vspeed;'
  },
  {
    name: 'width',
    type: 'property',
    description: 'The width of the object.',
    example: 'this.width = 32;'
  },
  {
    name: 'height',
    type: 'property',
    description: 'The height of the object.',
    example: 'this.height = 32;'
  },
  {
    name: 'speed',
    type: 'property',
    description: 'The overall speed of the object.',
    example: 'this.speed = 5;'
  },
  {
    name: 'direction',
    type: 'property',
    description: 'The movement direction in degrees (0-360).',
    example: 'this.direction = 90; // Move upward'
  },
  {
    name: 'hspeed',
    type: 'property',
    description: 'The horizontal speed component.',
    example: 'this.hspeed = 3; // Move right'
  },
  {
    name: 'vspeed',
    type: 'property',
    description: 'The vertical speed component.',
    example: 'this.vspeed = -4; // Move up'
  },
  {
    name: 'friction',
    type: 'property',
    description: 'The amount of friction applied to slow movement.',
    example: 'this.friction = 0.05; // Slow down gradually'
  },
  {
    name: 'gravity',
    type: 'property',
    description: 'The force of gravity applied to the object.',
    example: 'this.gravity = 0.2; // Apply gravity'
  },
  {
    name: 'gravity_direction',
    type: 'property',
    description: 'The direction in which gravity pulls (default 270, down).',
    example: 'this.gravity_direction = 270; // Pull downward'
  },
  {
    name: 'depth',
    type: 'property',
    description: 'The drawing depth/layer. Higher values are drawn first (behind lower values).',
    example: 'this.depth = 100; // Draw behind objects with depth < 100'
  },
  {
    name: 'visible',
    type: 'property',
    description: 'Controls if the object is drawn.',
    example: 'this.visible = false; // Make invisible'
  },
  {
    name: 'active',
    type: 'property',
    description: 'Controls if the object is updated.',
    example: 'this.active = false; // Pause object\'s logic'
  },
  
  // Color Constants
  {
    name: 'c_white',
    type: 'constant',
    description: 'White color: rgb(255, 255, 255)',
    example: 'draw_set_color(c_white);'
  },
  {
    name: 'c_black',
    type: 'constant',
    description: 'Black color: rgb(0, 0, 0)',
    example: 'draw_set_color(c_black);'
  },
  {
    name: 'c_red',
    type: 'constant',
    description: 'Red color: rgb(255, 0, 0)',
    example: 'draw_set_color(c_red);'
  },
  {
    name: 'c_blue',
    type: 'constant',
    description: 'Blue color: rgb(0, 0, 255)',
    example: 'draw_set_color(c_blue);'
  },
  {
    name: 'c_green',
    type: 'constant',
    description: 'Green color: rgb(0, 255, 0)',
    example: 'draw_set_color(c_green);'
  },
  {
    name: 'c_yellow',
    type: 'constant',
    description: 'Yellow color: rgb(255, 255, 0)',
    example: 'draw_set_color(c_yellow);'
  },
  {
    name: 'c_gray',
    type: 'constant',
    description: 'Gray color: rgb(128, 128, 128)',
    example: 'draw_set_color(c_gray);'
  },
  {
    name: 'c_ltgray',
    type: 'constant',
    description: 'Light gray color: rgb(176, 176, 176)',
    example: 'draw_set_color(c_ltgray);'
  },
  {
    name: 'c_dkgray',
    type: 'constant',
    description: 'Dark gray color: rgb(64, 64, 64)',
    example: 'draw_set_color(c_dkgray);'
  }
];

// Export the keywords for use in editor
function getKeywordHints() {
  return engineKeywords;
}

// Find documentation for a specific function name
function getFunctionDocs(funcName) {
  return engineKeywords.find(keyword => keyword.name === funcName);
}

// Generate HTML documentation for a function
function generateFunctionHelpHtml(funcName) {
  const func = getFunctionDocs(funcName);
  if (!func) return `<div class="no-docs">No documentation found for "${funcName}"</div>`;
  
  let paramsHtml = '';
  if (func.parameters && func.parameters.length) {
    paramsHtml = '<h4>Parameters:</h4><ul>';
    func.parameters.forEach(param => {
      paramsHtml += `<li><strong>${param.name}</strong> (${param.type}): ${param.description}</li>`;
    });
    paramsHtml += '</ul>';
  }
  
  return `
    <div class="function-help">
      <h3>${func.name}</h3>
      <div class="function-type">${func.type}</div>
      <div class="function-desc">${func.description}</div>
      ${paramsHtml}
      ${func.returns ? `<h4>Returns:</h4><div>${func.returns}</div>` : ''}
      <h4>Example:</h4>
      <pre><code>${func.example}</code></pre>
    </div>
  `;
}

// Get list of function names for autocomplete
function getKeywordCompletions() {
  return engineKeywords.map(k => ({
    text: k.name,
    displayText: k.name,
    hint: k.description,
    type: k.type
  }));
}

// Expose functions globally for use in the editor
window.getKeywordHints = getKeywordHints;
window.getFunctionDocs = getFunctionDocs;
window.generateFunctionHelpHtml = generateFunctionHelpHtml;
window.getKeywordCompletions = getKeywordCompletions;