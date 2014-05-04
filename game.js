// From http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Adopted from http://kaioa.com/node/103
var renderToCanvas = function (width, height, image) {
    var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    buffer.getContext('2d').drawImage(image, 0, 0);
    return buffer;
};

var game = (function () {

    // Constants
    var SCALE = 20;

    // Enums
    var KeyCode = {
        LEFT: 0,
        RIGHT: 1,
        UP: 2,
        ACTION: 3
    };

    var Direction = {
        LEFT: 0,
        RIGHT: 1
    };

    // Levels
    var currentLevel;
    var levels = [
        {
            'image': 'level1',
            'width': 343,
            'height': 64,
            'startX': 6,
            'startY': 54,
            'enemies': [
                { type: 'Zombie', startX: 99, startY: 55 },
                { type: 'Zombie', startX: 219, startY: 47 },
                { type: 'Spike', startX: 165, startY: 53 },
                { type: 'Spike', startX: 252, startY: 53 },
                { type: 'Spike', startX: 263, startY: 53 },
                { type: 'Spike', startX: 290, startY: 53 },
                { type: 'Spike', startX: 294, startY: 53 },
                { type: 'Spike', startX: 298, startY: 53 },
                { type: 'Spike', startX: 302, startY: 53 },
                { type: 'Spike', startX: 306, startY: 53 },
                { type: 'Spike', startX: 310, startY: 53 },
                { type: 'Spike', startX: 314, startY: 53 },
                { type: 'Spike', startX: 318, startY: 53 },
                { type: 'Spike', startX: 322, startY: 53 },
                { type: 'Spike', startX: 326, startY: 53 },
                { type: 'Spike', startX: 330, startY: 53 },
                { type: 'Spike', startX: 332, startY: 53 }
            ]
        }
    ];

    // State
    var keys = [];
    var spritesheets = [];
    var ctx;
    var level;
    var sprites = [];
    var now;

    function Zombie(x, y) {
        this.x = x;
        this.y = y;
        this.height = 6;
        this.width = 3;
        this.sx = 0;
        this.direction = Direction.RIGHT;
        this.lastUpdate = 0;
        this.damage = 1;

        this.update = function () {
            if (now - this.lastUpdate > 300) {
                this.lastUpdate = now;

                if (!checkCollision(this.direction == Direction.LEFT ? this.x - 1 : this.x + 3, this.y - 6, 1, 6)) {
                    this.x += this.direction == Direction.LEFT ? -1 : 1;
                } else {
                    this.direction = this.direction == Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
                }

                this.sx = (this.sx + 1) % 4;
                this.sy = this.direction == Direction.LEFT ? 1 : 0;
            }
        };

        this.draw = function () {
            ctx.translate(0, -6 * SCALE);
            ctx.drawImage(spritesheets['zombie'], this.sx * 3, this.sy * 6, 3, 6, this.x * SCALE, this.y * SCALE, 3 * SCALE, 6 * SCALE);
        };
    }

    function Spike(x, y) {
        this.x = x;
        this.y = y;
        this.height = 3;
        this.width = 3;
        this.damage = 3;

        this.update = function () {};

        this.draw = function () {
            ctx.translate(0, -3 * SCALE);
            ctx.drawImage(spritesheets['spikes'], 0, 0, 3, 3, this.x * SCALE, this.y * SCALE, 3 * SCALE, 3 * SCALE);
        };
    }

    function Player(x, y) {
        this.x = x;
        this.y = y;
        this.height = 6;
        this.width = 3;
        this.direction = Direction.RIGHT;
        this.lastUpdate = 0;
        this.jumpStarted = false;
        this.fallingSpeed = 0;
        this.lives = 3;
        this.lastDamage = 0;

        this.update = function () {
            if (now - this.lastUpdate > 80) {
                this.lastUpdate = now;

                if(this.lives > 0) {
                    // Move if left or right is pressed
                    if (keys[KeyCode.LEFT] > 0 || keys[KeyCode.RIGHT] > 0) {
                        this.direction = keys[KeyCode.LEFT] > keys[KeyCode.RIGHT] ? Direction.LEFT : Direction.RIGHT;
                        this.sx = (this.sx + 1) % 3;

                        for (var i = 0; i < 2; i++) {
                            var wallAhead = checkCollision(this.direction == Direction.LEFT ? this.x - 1 : this.x + 3, this.y - 6, 1, 5);
                            var stepAhead = checkCollision(this.direction == Direction.LEFT ? this.x - 1 : this.x + 3, this.y - 1, 1, 1);
                            if (!wallAhead && stepAhead) {
                                this.x += this.direction == Direction.LEFT ? -1 : 1;
                                this.y--;
                            } else if (!wallAhead) {
                                this.x += this.direction == Direction.LEFT ? -1 : 1;
                            }
                        }
                    } else {
                        this.sx = 0;
                    }

                    // If jump is pressed jump in case we aren't jumping or falling
                    if (keys[KeyCode.UP] > 0 && !this.jumpStarted && !this.isFalling()) {
                        this.jumpStarted = true;
                        this.jumpMoves = 0;
                    }

                    if (this.jumpStarted) {
                        // Jump for 4 ticks
                        if (this.jumpMoves < 4) {
                            var movement = 4 - this.jumpMoves;
                            this.sx = 3;

                            for (var i = 0; i < movement; i++) {
                                if (!checkCollision(this.x, this.y - 7, 3, 1)) {
                                    this.y--;
                                } else {
                                    this.jumpStarted = false;
                                }
                            }

                            this.jumpMoves++;
                        } else {
                            this.jumpStarted = false;
                        }
                    }
                } else {
                    if (keys[KeyCode.ACTION] > 0) {
                        loadLevel(currentLevel);
                    }
                }

                if (this.isFalling()) {
                    // Accelerate falling
                    if (this.fallingSpeed < 3) {
                        this.fallingSpeed++;
                    }

                    for (var i = 0; i < this.fallingSpeed; i++) {
                        if (this.isFalling()) {
                            this.y++;
                        }
                    }
                } else {
                    this.fallingSpeed = 0;
                }

                this.sy = this.direction == Direction.LEFT ? 1 : 0;
            }
        };

        this.draw = function () {
            if(this.lives > 0) {
                // Draw player
                ctx.translate(0, -6 * SCALE);
                ctx.drawImage(spritesheets['player'], this.sx * 3, this.sy * 6, 3, 6, this.x * SCALE, this.y * SCALE, 3 * SCALE, 6 * SCALE);
            } else {
                // Draw player
                ctx.translate(-1 * SCALE, -2 * SCALE);
                ctx.drawImage(spritesheets['dead'], 0, this.direction == Direction.LEFT ? 3 : 0, 6, 3, this.x * SCALE, this.y * SCALE, 6 * SCALE, 3 * SCALE);
            }
        };

        this.takeDamage = function(damage) {
            if(now - this.lastDamage > 500) {
                this.lives -= damage;
                this.lastDamage = now;
            }
        }

        this.isFalling = function () {
            if (this.jumpStarted) {
                return false;
            }

            // Check pixels directly under player
            return !checkCollision(this.x, this.y, 3, 1);
        };
    }

    function checkCollision(x, y, width, height) {
        if (x < 0 || y < 0 || y >= level.height) {
            return true;
        }

        for (var i = x; i < x + width; i++) {
            for (var j = y; j < y + height; j++) {
                var offset = i + j * level.width;
                if (level.imageData[offset * 4 + 3] != 0) {
                    return true;
                }
            }
        }
        return false;
    }

    function loop() {
        now = Date.now();

        // Update sprites
        for (var i = 0; i < sprites.length; i++) {
            sprites[i].update();

            // Check for collision with player
            if (i > 0) {
                // Overlap
                if (sprites[0].x < sprites[i].x + sprites[i].width && sprites[0].x + sprites[0].width > sprites[i].x
                    && sprites[0].y < sprites[i].y + sprites[i].height && sprites[0].y + sprites[0].height > sprites[i].y) {
                    sprites[0].takeDamage(sprites[i].damage);
                }
            }
        }

        // Center around the player
        var offsetX = sprites[0].x - 15;
        var offsetY = sprites[0].y - 16;

        // Enforce upper/lower bounds for offset
        offsetX = Math.max(0, Math.min(level.width - 32, offsetX));
        offsetY = Math.max(0, Math.min(level.height - 32, offsetY));
        //console.log(offsetX + ', ' + offsetY);

        ctx.fillStyle = '#16a9fe';
        ctx.fillRect(0, 0, 32 * SCALE, 32 * SCALE);

        // Draw level
        ctx.drawImage(spritesheets[level.image], 0, 0, level.width, level.height, -offsetX * SCALE, -offsetY * SCALE, level.width * SCALE, level.height * SCALE);

        // Draw sprites and player
        for (var i = sprites.length - 1; i >= 0 ; i--) {
            ctx.save();

            //Translate canvas to sprite position
            ctx.translate(-offsetX * SCALE, -offsetY * SCALE);

            sprites[i].draw();

            ctx.restore();
        }

        // Draw HUD
        for (var i = 0; i < sprites[0].lives; i++) {
            ctx.drawImage(spritesheets['heart'], 0, 0, 3, 3, (1 + i * 4) * SCALE, 1 * SCALE, 3 * SCALE, 3 * SCALE);
        }

        if(sprites[0].x >= level.width) {
            if(currentLevel < levels.length - 1) {
                currentLevel++;
                loadLevel(currentLevel);
            } else {
                ctx.drawImage(spritesheets['end'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
                document.onkeyup = null;
                document.onkeydown = null;
                return;
            }
        }

        requestAnimFrame(loop);
    }

    function loadLevel(l) {
        currentLevel = l;
        level = levels[currentLevel];
        level.canvas = renderToCanvas(level.width, level.height, spritesheets[level.image]);
        level.imageData = level.canvas.getContext("2d").getImageData(0, 0, level.width, level.height).data;

        sprites = [];
        sprites.push(new Player(level.startX, level.startY));

        for (var i = 0; i < level.enemies.length; i++) {
            var enemy = level.enemies[i];
            if (enemy.type == 'Zombie') {
                sprites.push(new Zombie(enemy.startX, enemy.startY));
            } else if (enemy.type == 'Spike') {
                sprites.push(new Spike(enemy.startX, enemy.startY));
            }
        }
    }

    function init() {
        console.log('Initializing');
        ctx = document.getElementById('game').getContext('2d');
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;

        var keyListener = function (e) {
            var pressed = e.type == 'keydown';
            switch (e.keyCode) {
                case 65: //a
                case 37: //left arrow
                    keys[KeyCode.LEFT] = pressed ? e.timeStamp : 0;
                    return true;

                case 68: //d
                case 39: //left arrow
                    keys[KeyCode.RIGHT] = pressed ? e.timeStamp : 0;
                    return true;

                case 87: //w
                case 38: //up arrow
                    keys[KeyCode.UP] = pressed ? e.timeStamp : 0;
                    return true;

                case 32: //space
                    keys[KeyCode.ACTION] = pressed ? e.timeStamp : 0;
                    e.preventDefault();

                    return true;
            }
        };

        var sources = [ 'img/player.png', 'img/heart.png', 'img/zombie.png', 'levels/level1.png', 'img/dead.png', 'img/spikes.png', 'img/end.png', 'img/splash.png' ];
        var loaded = 0;
        var onload = function () {
            loaded++;
            var name = this.id.substr(this.id.lastIndexOf('/') + 1, this.id.length - this.id.lastIndexOf('/') - 5);
            spritesheets[name] = this;
            console.log('Loaded ' + name);
            if (loaded >= sources.length) {
                ctx.drawImage(spritesheets['splash'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
                window.setTimeout(function() {
                    //Set up key listener
                    document.onkeyup = keyListener;
                    document.onkeydown = keyListener;

                    loadLevel(0);
                    requestAnimFrame(loop);
                }, 2000);
            }
        };

        for (var i = 0; i < sources.length; i++) {
            var imageObj = new Image();
            imageObj.onload = onload;
            imageObj.id = sources[i];
            imageObj.src = sources[i];
        }
    }

    return {
        init: init
    }

})();

window.onload = game.init;