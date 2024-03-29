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
    var NUM_SCANLINES = 5;
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
            'image': 'level0',
            'width': 254,
            'height': 64,
            'startX': 1,
            'startY': 54,
            'enemies': [
                { type: 'Zombie', startX: 99, startY: 47 },
                { type: 'Zombie', startX: 127, startY: 47 },
                { type: 'Zombie', startX: 150, startY: 47 },
                { type: 'Zombie', startX: 210, startY: 54 }
            ]
        },
        {
            'image': 'level1',
            'width': 343,
            'height': 64,
            'startX': 1,
            'startY': 54,
            'enemies': [
                { type: 'Zombie', startX: 99, startY: 54 },
                { type: 'Zombie', startX: 219, startY: 46 },
                { type: 'Spike', startX: 165, startY: 52 },
                { type: 'Spike', startX: 252, startY: 52 },
                { type: 'Spike', startX: 263, startY: 52 },
                { type: 'Spike', startX: 290, startY: 52 },
                { type: 'Spike', startX: 294, startY: 52 },
                { type: 'Spike', startX: 298, startY: 52 },
                { type: 'Spike', startX: 302, startY: 52 },
                { type: 'Spike', startX: 306, startY: 52 },
                { type: 'Spike', startX: 310, startY: 52 },
                { type: 'Spike', startX: 314, startY: 52 },
                { type: 'Spike', startX: 318, startY: 52 },
                { type: 'Spike', startX: 322, startY: 52 },
                { type: 'Spike', startX: 326, startY: 52 },
                { type: 'Spike', startX: 330, startY: 52 },
                { type: 'Spike', startX: 332, startY: 52 }
            ]
        },
        {
            'image': 'level2',
            'width': 92,
            'height': 300,
            'startX': 1,
            'startY': 290,
            'enemies': [
                { type: 'CeilingTrap', startX: 15, startY: 274 },
                { type: 'Zombie', startX: 35, startY: 282 },
                { type: 'Spike', startX: 61, startY: 288 },
                { type: 'Spike', startX: 65, startY: 288 },
                { type: 'Spike', startX: 69, startY: 288 },
                { type: 'Spike', startX: 73, startY: 288 },
                { type: 'Spike', startX: 75, startY: 288 },
                { type: 'CeilingTrap', startX: 37, startY: 244 },
                { type: 'Zombie', startX: 38, startY: 235 },
                { type: 'Spike', startX: 67, startY: 239 },
                { type: 'Spike', startX: 71, startY: 239 },
                { type: 'Spike', startX: 82, startY: 239 },
                { type: 'CeilingTrap', startX: 40, startY: 220 },
                { type: 'CeilingTrap', startX: 27, startY: 220 }
            ]
        },
        {
            'image': 'level3',
            'width': 191,
            'height': 64,
            'startX': 1,
            'startY': 47,
            'enemies': [
                { type: 'CeilingTrap', startX: 18, startY: 36 },
                { type: 'CeilingTrap', startX: 55, startY: 35 },
                { type: 'Zombie', startX: 29, startY: 54 },
                { type: 'Spike', startX: 82, startY: 45 },
                { type: 'Spike', startX: 86, startY: 45 },
                { type: 'Spike', startX: 98, startY: 54 },
                { type: 'CeilingTrap', startX: 101, startY: 18 },
                { type: 'Spike', startX: 111, startY: 49 },
                { type: 'Zombie', startX: 132, startY: 54 },
                { type: 'Zombie', startX: 148, startY: 46 }
            ]
        }
    ];

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

    var spritesheets = [];
    var sounds = [];

    // State
    var keys = [];
    var lastScanline = 0;
    var scanline = 0;
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
            if (now - this.lastUpdate > 200) {
                this.lastUpdate = now;

                if (!checkCollision(this.direction == Direction.LEFT ? this.x - 1 : this.x + 3, this.y - 5, 1, 6)) {
                    this.x += this.direction == Direction.LEFT ? -1 : 1;
                } else {
                    this.direction = this.direction == Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
                }

                this.sx = (this.sx + 1) % 4;
                this.sy = this.direction == Direction.LEFT ? 1 : 0;
            }

            if (Math.abs(this.x - sprites[0].x) < 15 && Math.abs(this.y - sprites[0].y) < 15 && (!sounds['zombie'].lastPlayed || now - sounds['zombie'].lastPlayed > 3000)) {
                sounds['zombie'].lastPlayed = now;

                var zombieSound = 'zombie';
                var rand = Math.random();
                if (rand < 0.33) {
                    zombieSound = 'zombie2';
                } else if (rand < 0.67) {
                    zombieSound = 'zombie3';
                }
                sounds[zombieSound].play();
            }
        };

        this.draw = function () {
            ctx.translate(0, -5 * SCALE);
            ctx.drawImage(spritesheets['zombie'], this.sx * 3, this.sy * 6, 3, 6, this.x * SCALE, this.y * SCALE, 3 * SCALE, 6 * SCALE);
        };
    }

    function Spike(x, y) {
        this.x = x;
        this.y = y;
        this.height = 3;
        this.width = 3;
        this.damage = 3;

        this.update = function () {
        };

        this.draw = function () {
            ctx.translate(0, -2 * SCALE);
            ctx.drawImage(spritesheets['spikes'], 0, 0, 3, 3, this.x * SCALE, this.y * SCALE, 3 * SCALE, 3 * SCALE);
        };
    }

    function CeilingTrap(x, y) {
        this.x = x;
        this.y = y;
        this.height = 2;
        this.width = 1;
        this.damage = 1;
        this.lastUpdate = 0;
        this.falling = false;

        this.update = function () {
            // If in line underneath the trap
            if (!this.falling && this.y < sprites[0].y && this.x >= sprites[0].x && this.x < sprites[0].x + 3) {
                for (var j = this.y; j < sprites[0].y - 6; j++) {
                    var offset = this.x + j * level.width;
                    if (level.imageData[offset * 4 + 3] != 0) {
                        return;
                    }
                }

                this.falling = true;
                sounds['falling'].play();
            }

            if (this.falling && now - this.lastUpdate > 40) {
                this.lastUpdate = now;

                if (checkCollision(this.x, this.y + 1, 1, 1)) {
                    this.disabled = true;
                } else {
                    this.y++;
                }
            }
        };

        this.draw = function () {
            ctx.translate(0, -1 * SCALE);
            ctx.drawImage(spritesheets['ceiling'], 0, 0, 1, 2, this.x * SCALE, this.y * SCALE, this.width * SCALE, this.height * SCALE);
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

                if (this.lives > 0) {
                    // Move if left or right is pressed
                    if (keys[KeyCode.LEFT] > 0 || keys[KeyCode.RIGHT] > 0) {
                        this.direction = keys[KeyCode.LEFT] > keys[KeyCode.RIGHT] ? Direction.LEFT : Direction.RIGHT;
                        this.sx = (this.sx + 1) % 3;

                        for (var i = 0; i < 2; i++) {
                            var wallAhead = checkCollision(this.direction == Direction.LEFT ? this.x : this.x + 2, this.y - 5, 1, 5);
                            var stepAhead = checkCollision(this.direction == Direction.LEFT ? this.x : this.x + 2, this.y, 1, 1);
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
                        if (this.jumpMoves < 2) {
                            var movement = 3 - Math.floor(this.jumpMoves);
                            this.sx = 3;

                            for (var i = 0; i < movement; i++) {
                                if (!checkCollision(this.direction == Direction.RIGHT ? this.x : this.x + 1, this.y - 6, 2, 1)) {
                                    this.y--;
                                } else {
                                    this.jumpStarted = false;
                                }
                            }

                            this.jumpMoves += 0.5;
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
            if (this.lives > 0) {
                // Draw player
                ctx.translate(0, -5 * SCALE);
                ctx.drawImage(spritesheets['player'], this.sx * 3, this.sy * 6, 3, 6, this.x * SCALE, this.y * SCALE, 3 * SCALE, 6 * SCALE);
            } else {
                // Draw player
                ctx.translate(-1 * SCALE, -1 * SCALE);
                ctx.drawImage(spritesheets['dead'], 0, this.direction == Direction.LEFT ? 3 : 0, 6, 3, this.x * SCALE, this.y * SCALE, 6 * SCALE, 3 * SCALE);
            }
        };

        this.takeDamage = function (damage) {
            if (now - this.lastDamage > 500 && this.lives > 0) {
                this.lives -= damage;
                this.lastDamage = now;

                if (this.lives <= 0) {
                    sounds['death'].play();
                } else {
                    sounds['hurt'].play();
                }
            }
        }

        this.isFalling = function () {
            if (this.jumpStarted && this.lives > 0) {
                return false;
            }

            // Check pixels directly under player
            return !checkCollision(this.direction == Direction.RIGHT ? this.x : this.x + 1, this.y + 1, 2, 1);
        };
    }

    function checkCollision(x, y, width, height) {
        if (x < 0 || y < 0 || y >= level.height) {
            return true;
        }

        for (var i = x; i < x + width && i < level.width; i++) {
            for (var j = y; j < y + height; j++) {
                var offset = i + j * level.width;
                if (offset * 4 + 3 < level.imageData.length && level.imageData[offset * 4 + 3] != 0) {
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
            if (sprites[i].disabled) {
                continue;
            }

            sprites[i].update();

            // Check for collision with player
            if (i > 0) {
                if (sprites[0].x < sprites[i].x + sprites[i].width && sprites[i].x < sprites[0].x + sprites[0].width
                    && sprites[0].y - sprites[0].height < sprites[i].y && sprites[i].y - sprites[i].height < sprites[0].y) {
                    sprites[0].takeDamage(sprites[i].damage);
                }
            }
        }

        // Center around the player
        var offsetX = sprites[0].x - 15;
        var offsetY = sprites[0].y - 16;

        // Screen shake when hurt
        var shake = 500;
        var diff = now - sprites[0].lastDamage;
        if (diff < shake) {
            offsetX += diff < shake / 4 || diff > shake * 3 / 4 ? -1 : 1;
            offsetY += diff < shake / 2 ? -1 : 1;
        }

        // Enforce upper/lower bounds for offset
        offsetX = Math.max(0, Math.min(level.width - 32, offsetX));
        offsetY = Math.max(0, Math.min(level.height - 32, offsetY));

        ctx.fillStyle = '#16a9fe';
        ctx.fillRect(0, 0, 32 * SCALE, 32 * SCALE);

        // Draw level
        ctx.drawImage(spritesheets[level.image], 0, 0, level.width, level.height, -offsetX * SCALE, -offsetY * SCALE, level.width * SCALE, level.height * SCALE);

        // Draw sprites and player
        for (var i = sprites.length - 1; i >= 0; i--) {
        //for (var i = 0; i < sprites.length; i++) {
            ctx.save();

            //Translate canvas to sprite position
            ctx.translate(-offsetX * SCALE, -offsetY * SCALE);

            sprites[i].draw();

            ctx.restore();
        }

        // Draw HUD
        for (var i = 0; i < sprites[0].lives; i++) {
            ctx.drawImage(spritesheets['heart'], 0, 0, 3, 3, (32 - (i + 1) * 4) * SCALE, 1 * SCALE, 3 * SCALE, 3 * SCALE);
        }

        if (sprites[0].x >= level.width) {
            if (currentLevel < levels.length - 1) {
                currentLevel++;
                loadLevel(currentLevel);
            } else {
                ctx.drawImage(spritesheets['end'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
                applyFx();
                document.onkeyup = null;
                document.onkeydown = null;
                requestAnimFrame(outro);
                return;
            }
        }

        // Draw FX
        applyFx();

        requestAnimFrame(loop);
    }

    function applyFx() {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(spritesheets['overlay'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
        ctx.globalAlpha = 1;
        ctx.drawImage(spritesheets['scanline' + scanline], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
        if (now - lastScanline > 100) {
            lastScanline = now;
            scanline = (scanline + 1) % NUM_SCANLINES;
        }
        ctx.restore();
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
            } else if (enemy.type == 'CeilingTrap') {
                sprites.push(new CeilingTrap(enemy.startX, enemy.startY));
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

        loadImages();
        loadSounds();
    }

    function loadSounds() {
        var soundsLoaded = 0;
        var soundPaths = [
            'background2',
            'zombie',
            'zombie2',
            'zombie3',
            'death',
            'hurt',
            'falling'
        ];

        var onload = function () {
            soundsLoaded++;
            console.log('Loaded sound ' + this.id);
            if (soundsLoaded >= soundPaths.length) {
                loadComplete();
            }
        }

        soundManager.setup({
            url: 'swf',
            preferFlash: true,
            debugMode: false,
            flashVersion: 8,
            onready: function () {
                for (var i = 0; i < soundPaths.length; i++) {
                    sounds[soundPaths[i]] = soundManager.createSound({
                        id: soundPaths[i],
                        url: 'sounds/' + soundPaths[i] + '.mp3',
                        autoLoad: true,
                        volume: 60,
                        onload: onload
                    });
                }
            }
        });
    }

    function loadImages() {
        var sources = [
            'img/player.png',
            'img/heart.png',
            'img/zombie.png',
            'img/dead.png',
            'img/spikes.png',
            'img/ceiling.png',
            'img/end.png',
            'img/splash.png',
            'img/splash2.png',
            'img/splash3.png',
            'img/overlay.png'
        ];
        for (var i = 0; i < levels.length; i++) {
            sources.push('levels/' + levels[i].image + '.png');
        }

        var loaded = 0;
        var onload = function () {
            loaded++;
            var name = this.id.substr(this.id.lastIndexOf('/') + 1, this.id.length - this.id.lastIndexOf('/') - 5);
            spritesheets[name] = this;
            console.log('Loaded ' + name);

            if (loaded >= sources.length) {
                loadComplete();
            }
        };

        // Generate scanline overlays
        for (var x = 0; x < NUM_SCANLINES; x++) {
            var buffer = document.createElement('canvas');
            buffer.width = 32;
            buffer.height = 32;
            var bufferCtx = buffer.getContext('2d');
            for (var i = 0; i < 32; i++) {
                for (var j = 0; j < 32; j++) {
                    var alpha = j % 6 >= 3 && j % 6 <= 5 ? Math.random() * 0.05 : 0.04 + Math.random() * 0.05;
                    bufferCtx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
                    bufferCtx.fillRect(i, j, 1, 1);
                }
            }
            spritesheets['scanline' + x] = buffer;
        }

        // Start loading sprites
        for (var i = 0; i < sources.length; i++) {
            var imageObj = new Image();
            imageObj.onload = onload;
            imageObj.id = sources[i];
            imageObj.src = sources[i];
        }
    }

    var toLoad = 2; // Sound and Music
    var loaded = 0;

    function loadComplete() {
        loaded++;
        if (loaded == toLoad) {
            sounds['background2'].play({ loops: 3 });
            requestAnimFrame(intro);
        }
    }

    var introStarted = null;
    var introTotal = 3000;

    function intro() {
        now = Date.now();
        if (introStarted == null) {
            introStarted = now;
        }

        if (now - introStarted < introTotal / 3) {
            ctx.drawImage(spritesheets['splash'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
        } else if (now - introStarted < introTotal * 2 / 3) {
            ctx.drawImage(spritesheets['splash2'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
        } else {
            ctx.drawImage(spritesheets['splash3'], 0, 0, 32, 32, 0, 0, 32 * SCALE, 32 * SCALE);
        }
        applyFx();

        if (now - introStarted < introTotal) {
            requestAnimFrame(intro);
        } else {
            //Set up key listener
            document.onkeyup = keyListener;
            document.onkeydown = keyListener;

            loadLevel(0);
            requestAnimFrame(loop);
        }
    }

    var outroStarted = null;

    function outro() {
        now = Date.now();
        if (outroStarted == null) {
            outroStarted = now;
        }

        if (now - outroStarted > 2000) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, 32 * SCALE, 32 * SCALE);
        }

        requestAnimFrame(outro);
    }

    return {
        init: init
    }

})();

window.onload = game.init;