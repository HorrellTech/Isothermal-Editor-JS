/**
 * Game Engine Keywords and Function Documentation
 * Used for code hints and autocomplete functionality
 */

const engineKeywords = [
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
  {
    name: 'instance_exists',
    type: 'function',
    description: 'Checks if an instance exists in the game.',
    parameters: [
      { name: 'instance', type: 'object', description: 'The instance to check' }
    ],
    returns: 'boolean',
    example: 'if(instance_exists(boss)) {\n  // Boss is still alive\n}'
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
    name: 'draw_text_ext',
    type: 'function',
    description: 'Draws text with line wrapping at the specified position.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position to draw the text' },
      { name: 'y', type: 'number', description: 'Y position to draw the text' },
      { name: 'text', type: 'string', description: 'The text to draw' },
      { name: 'lineHeight', type: 'number', description: 'Height of each line in pixels' },
      { name: 'maxWidth', type: 'number', description: 'Maximum width before wrapping text' }
    ],
    returns: 'void',
    example: 'draw_text_ext(10, 10, "Long text that will wrap...", 24, 200);'
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
  {
    name: 'draw_set_line_width',
    type: 'function',
    description: 'Sets the width of lines for subsequent drawing operations.',
    parameters: [
      { name: 'width', type: 'number', description: 'Line width in pixels' }
    ],
    returns: 'void',
    example: 'draw_set_line_width(3);\ndraw_line(10, 10, 100, 100);'
  },
  {
    name: 'draw_line',
    type: 'function',
    description: 'Draws a line between two points.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the first point' },
      { name: 'y1', type: 'number', description: 'Y position of the first point' },
      { name: 'x2', type: 'number', description: 'X position of the second point' },
      { name: 'y2', type: 'number', description: 'Y position of the second point' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_white);\ndraw_line(0, 0, mouse_x, mouse_y);'
  },
  {
    name: 'draw_circle',
    type: 'function',
    description: 'Draws a circle with the given radius.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position of the center' },
      { name: 'y', type: 'number', description: 'Y position of the center' },
      { name: 'radius', type: 'number', description: 'Radius of the circle' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled circle' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_yellow);\ndraw_circle(this.x, this.y, 32, false);'
  },
  {
    name: 'draw_ellipse',
    type: 'function',
    description: 'Draws an ellipse with the given width and height.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position of the center' },
      { name: 'y', type: 'number', description: 'Y position of the center' },
      { name: 'width', type: 'number', description: 'Width of the ellipse' },
      { name: 'height', type: 'number', description: 'Height of the ellipse' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled ellipse' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_green);\ndraw_ellipse(100, 100, 80, 40, true);'
  },
  {
    name: 'draw_roundrect',
    type: 'function',
    description: 'Draws a rectangle with rounded corners.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the top-left corner' },
      { name: 'y1', type: 'number', description: 'Y position of the top-left corner' },
      { name: 'x2', type: 'number', description: 'X position of the bottom-right corner' },
      { name: 'y2', type: 'number', description: 'Y position of the bottom-right corner' },
      { name: 'radius', type: 'number', description: 'Radius of the rounded corners' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled rectangle' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_blue);\ndraw_roundrect(20, 20, 120, 80, 15, false);'
  },
  {
    name: 'draw_gradient_rect',
    type: 'function',
    description: 'Draws a rectangle with a color gradient.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the top-left corner' },
      { name: 'y1', type: 'number', description: 'Y position of the top-left corner' },
      { name: 'x2', type: 'number', description: 'X position of the bottom-right corner' },
      { name: 'y2', type: 'number', description: 'Y position of the bottom-right corner' },
      { name: 'color1', type: 'string', description: 'Start color of the gradient' },
      { name: 'color2', type: 'string', description: 'End color of the gradient' },
      { name: 'vertical', type: 'boolean', description: 'True for vertical gradient, false for horizontal' }
    ],
    returns: 'void',
    example: 'draw_gradient_rect(0, 0, room_width, room_height, c_blue, c_black, true);'
  },
  {
    name: 'draw_triangle',
    type: 'function',
    description: 'Draws a triangle between three points.',
    parameters: [
      { name: 'x1', type: 'number', description: 'X position of the first point' },
      { name: 'y1', type: 'number', description: 'Y position of the first point' },
      { name: 'x2', type: 'number', description: 'X position of the second point' },
      { name: 'y2', type: 'number', description: 'Y position of the second point' },
      { name: 'x3', type: 'number', description: 'X position of the third point' },
      { name: 'y3', type: 'number', description: 'Y position of the third point' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled triangle' }
    ],
    returns: 'void',
    example: 'draw_set_color(c_red);\ndraw_triangle(100, 50, 150, 150, 50, 150, false);'
  },
  {
    name: 'draw_sprite',
    type: 'function',
    description: 'Draws a sprite at the specified position.',
    parameters: [
      { name: 'sprite', type: 'sprite', description: 'The sprite to draw' },
      { name: 'x', type: 'number', description: 'X position to draw the sprite' },
      { name: 'y', type: 'number', description: 'Y position to draw the sprite' }
    ],
    returns: 'void',
    example: 'draw_sprite(player_sprite, this.x, this.y);'
  },
  {
    name: 'draw_sprite_ext',
    type: 'function',
    description: 'Draws a sprite with scaling, rotation, and transparency.',
    parameters: [
      { name: 'sprite', type: 'sprite', description: 'The sprite to draw' },
      { name: 'x', type: 'number', description: 'X position to draw the sprite' },
      { name: 'y', type: 'number', description: 'Y position to draw the sprite' },
      { name: 'xscale', type: 'number', description: 'Horizontal scaling factor' },
      { name: 'yscale', type: 'number', description: 'Vertical scaling factor' },
      { name: 'rotation', type: 'number', description: 'Rotation angle in degrees' },
      { name: 'alpha', type: 'number', description: 'Alpha transparency (0-1)' }
    ],
    returns: 'void',
    example: 'draw_sprite_ext(player_sprite, this.x, this.y, 1.5, 1.5, this.angle, 0.8);'
  },
  {
    name: 'draw_sprite_part',
    type: 'function',
    description: 'Draws a specific frame from a sprite sheet.',
    parameters: [
      { name: 'sprite', type: 'sprite', description: 'The sprite sheet to draw from' },
      { name: 'frame', type: 'number', description: 'The frame number to draw' },
      { name: 'x', type: 'number', description: 'X position to draw the sprite' },
      { name: 'y', type: 'number', description: 'Y position to draw the sprite' },
      { name: 'width', type: 'number', description: 'Width to draw the frame (optional)' },
      { name: 'height', type: 'number', description: 'Height to draw the frame (optional)' }
    ],
    returns: 'void',
    example: 'draw_sprite_part(character_sheet, this.animation_frame, this.x, this.y);'
  },
  
  // Shape Drawing System
  {
    name: 'draw_shape_start',
    type: 'function',
    description: 'Starts drawing a custom shape from the specified position.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position of the starting point' },
      { name: 'y', type: 'number', description: 'Y position of the starting point' },
      { name: 'outline', type: 'boolean', description: 'True for outline, false for filled shape (optional, default: true)' },
      { name: 'spline', type: 'number', description: 'Spline tension factor, 0 for no spline (optional, default: 0)' }
    ],
    returns: 'boolean',
    example: 'draw_shape_start(100, 100, false, 0.5); // Start a filled shape with spline smoothing'
  },
  {
    name: 'draw_shape_point',
    type: 'function',
    description: 'Adds a point to the current shape being drawn.',
    parameters: [
      { name: 'x', type: 'number', description: 'X position of the point' },
      { name: 'y', type: 'number', description: 'Y position of the point' }
    ],
    returns: 'boolean',
    example: 'draw_shape_point(150, 50);\ndraw_shape_point(200, 100);\ndraw_shape_point(150, 150);'
  },
  {
    name: 'draw_shape_end',
    type: 'function',
    description: 'Finishes and renders the custom shape.',
    parameters: [
      { name: 'closeShape', type: 'boolean', description: 'Whether to close the shape by connecting last point to first (optional, default: true)' }
    ],
    returns: 'boolean',
    example: 'draw_shape_end(); // Draws the shape with all added points'
  },
  
  // Surface Functions
  {
    name: 'surface_create',
    type: 'function',
    description: 'Creates a new drawing surface with the specified dimensions.',
    parameters: [
      { name: 'width', type: 'number', description: 'Width of the surface in pixels' },
      { name: 'height', type: 'number', description: 'Height of the surface in pixels' }
    ],
    returns: 'surface',
    example: 'const lightSurface = surface_create(room_width, room_height);'
  },
  {
    name: 'surface_set_target',
    type: 'function',
    description: 'Sets the specified surface as the active drawing target.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to set as the target' }
    ],
    returns: 'boolean',
    example: 'surface_set_target(lightSurface);\ndraw_circle(100, 100, 50, false);\nsurface_reset_target();'
  },
  {
    name: 'surface_reset_target',
    type: 'function',
    description: 'Resets the drawing target back to the previous surface or main canvas.',
    parameters: [],
    returns: 'boolean',
    example: 'surface_set_target(effectSurface);\n// Draw effects here\nsurface_reset_target();'
  },
  {
    name: 'surface_free',
    type: 'function',
    description: 'Releases the memory used by a surface.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to free from memory' }
    ],
    returns: 'boolean',
    example: 'if(surface_exists(tempSurface)) {\n  surface_free(tempSurface);\n}'
  },
  {
    name: 'surface_exists',
    type: 'function',
    description: 'Checks if a surface is valid and exists.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to check' }
    ],
    returns: 'boolean',
    example: 'if(!surface_exists(lightSurface)) {\n  lightSurface = surface_create(room_width, room_height);\n}'
  },
  {
    name: 'draw_surface',
    type: 'function',
    description: 'Draws a surface at the specified position.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to draw' },
      { name: 'x', type: 'number', description: 'X position to draw the surface' },
      { name: 'y', type: 'number', description: 'Y position to draw the surface' },
      { name: 'width', type: 'number', description: 'Width to draw the surface (optional)' },
      { name: 'height', type: 'number', description: 'Height to draw the surface (optional)' }
    ],
    returns: 'boolean',
    example: 'draw_surface(lightSurface, 0, 0);'
  },
  {
    name: 'draw_surface_part',
    type: 'function',
    description: 'Draws a part of a surface.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to draw from' },
      { name: 'sx', type: 'number', description: 'X position in the source surface' },
      { name: 'sy', type: 'number', description: 'Y position in the source surface' },
      { name: 'sw', type: 'number', description: 'Width of the region in the source surface' },
      { name: 'sh', type: 'number', description: 'Height of the region in the source surface' },
      { name: 'x', type: 'number', description: 'X position to draw to' },
      { name: 'y', type: 'number', description: 'Y position to draw to' },
      { name: 'width', type: 'number', description: 'Width to draw (optional)' },
      { name: 'height', type: 'number', description: 'Height to draw (optional)' }
    ],
    returns: 'boolean',
    example: 'draw_surface_part(worldSurface, view_xview, view_yview, view_wview, view_hview, 0, 0);'
  },
  {
    name: 'surface_clear',
    type: 'function',
    description: 'Clears a surface with a specific color.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to clear' },
      { name: 'color', type: 'string', description: 'The color to fill with (optional)' }
    ],
    returns: 'boolean',
    example: 'surface_clear(lightSurface, c_black);'
  },
  {
    name: 'surface_save',
    type: 'function',
    description: 'Saves a surface as an image file.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to save' },
      { name: 'filename', type: 'string', description: 'Filename to save as (optional)' }
    ],
    returns: 'boolean',
    example: 'surface_save(screenSurface, "screenshot.png");'
  },
  {
    name: 'surface_getpixel',
    type: 'function',
    description: 'Gets the color of a pixel from a surface.',
    parameters: [
      { name: 'surface', type: 'surface', description: 'The surface to get the pixel from' },
      { name: 'x', type: 'number', description: 'X position of the pixel' },
      { name: 'y', type: 'number', description: 'Y position of the pixel' }
    ],
    returns: 'object',
    example: 'const pixelColor = surface_getpixel(worldSurface, mouse_x, mouse_y);'
  },
  {
    name: 'surface_copy',
    type: 'function',
    description: 'Copies content from one surface to another.',
    parameters: [
      { name: 'targetSurface', type: 'surface', description: 'The surface to copy to' },
      { name: 'x', type: 'number', description: 'X position in the target surface' },
      { name: 'y', type: 'number', description: 'Y position in the target surface' },
      { name: 'sourceSurface', type: 'surface', description: 'The surface to copy from' }
    ],
    returns: 'boolean',
    example: 'surface_copy(backupSurface, 0, 0, mainSurface);'
  },
  
  // Blend Modes
  {
    name: 'surface_set_blendmode',
    type: 'function',
    description: 'Sets the current blend mode for subsequent drawing operations.',
    parameters: [
      { name: 'mode', type: 'string', description: 'Blend mode to use (e.g., bm_normal, bm_add)' }
    ],
    returns: 'boolean',
    example: 'surface_set_blendmode(bm_add);\ndraw_surface(lightSurface, 0, 0);\nsurface_set_blendmode_normal();'
  },
  {
    name: 'surface_set_blendmode_normal',
    type: 'function',
    description: 'Resets the blend mode to normal (source-over).',
    parameters: [],
    returns: 'void',
    example: 'surface_set_blendmode_normal();'
  },
  {
    name: 'surface_set_blendmode_add',
    type: 'function',
    description: 'Sets the blend mode to additive.',
    parameters: [],
    returns: 'void',
    example: 'surface_set_blendmode_add();\ndraw_surface(lightSurface, 0, 0);\nsurface_set_blendmode_normal();'
  },
  {
    name: 'surface_set_blendmode_subtract',
    type: 'function',
    description: 'Sets the blend mode to subtractive.',
    parameters: [],
    returns: 'void',
    example: 'surface_set_blendmode_subtract();\ndraw_surface(shadowSurface, 0, 0);\nsurface_set_blendmode_normal();'
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
  
  // Random Functions
  {
    name: 'random',
    type: 'function',
    description: 'Returns a random float number between 0 and the specified value.',
    parameters: [
      { name: 'max', type: 'number', description: 'Maximum value (exclusive)' }
    ],
    returns: 'number',
    example: 'const speed = 2 + random(3); // Random value between 2 and 5'
  },
  {
    name: 'random_range',
    type: 'function',
    description: 'Returns a random float number between the specified min and max values.',
    parameters: [
      { name: 'min', type: 'number', description: 'Minimum value (inclusive)' },
      { name: 'max', type: 'number', description: 'Maximum value (exclusive)' }
    ],
    returns: 'number',
    example: 'const enemySize = random_range(0.8, 1.5);'
  },
  {
    name: 'irandom',
    type: 'function',
    description: 'Returns a random integer between 0 and the specified value.',
    parameters: [
      { name: 'max', type: 'number', description: 'Maximum value (inclusive)' }
    ],
    returns: 'number',
    example: 'const coins = irandom(5); // 0-5 coins'
  },
  {
    name: 'irandom_range',
    type: 'function',
    description: 'Returns a random integer between the specified min and max values.',
    parameters: [
      { name: 'min', type: 'number', description: 'Minimum value (inclusive)' },
      { name: 'max', type: 'number', description: 'Maximum value (inclusive)' }
    ],
    returns: 'number',
    example: 'const damage = irandom_range(5, 10); // 5-10 damage'
  },
  
  // Blend Mode Constants
  {
    name: 'bm_normal',
    type: 'constant',
    description: 'Normal blend mode (source-over)',
    example: 'surface_set_blendmode(bm_normal);'
  },
  {
    name: 'bm_add',
    type: 'constant',
    description: 'Additive blend mode (lighter)',
    example: 'surface_set_blendmode(bm_add);'
  },
  {
    name: 'bm_subtract',
    type: 'constant',
    description: 'Subtractive blend mode (difference)',
    example: 'surface_set_blendmode(bm_subtract);'
  },
  {
    name: 'bm_multiply',
    type: 'constant',
    description: 'Multiply blend mode',
    example: 'surface_set_blendmode(bm_multiply);'
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