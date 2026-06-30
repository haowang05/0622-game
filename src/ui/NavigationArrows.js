/**
 * NavigationArrows — 场景导航箭头
 */
window.QW = window.QW || {};

QW.NavigationArrows = class {

    constructor(scene, factory, manifestKey, config = {}) {
        this.scene = scene;
        this.factory = factory;
        this.manifestKey = manifestKey;
        this.config = Object.assign({}, config);

        if (this.config.useLivingRoomPeers) {
            this.config.peers = QW.GameState.getLivingRoomPeers();
        }

        this.depth = config.depth || 90;
        this.sprites = {};
        this._build();
    }

    _build() {
        const prefix = this.manifestKey;
        const loader = QW.AssetLoaderInstance;
        const needsArrows = (this.config.peers && this.config.peers.length > 1) ||
            this.config.leftTarget || this.config.rightTarget;

        if (needsArrows) {
            const leftName = prefix + '/左箭头.png';
            const rightName = prefix + '/右箭头.png';
            const hasLeft = loader.getAssetInfo(this.manifestKey, leftName);
            const hasRight = loader.getAssetInfo(this.manifestKey, rightName);

            if (hasLeft && hasRight) {
                const MARGIN = 60;
                const CANVAS_W = 2800;
                const CANVAS_H = 1840;
                const centerY = CANVAS_H / 2;

                const leftTexKey = loader.getKey(this.manifestKey, leftName);
                const rightTexKey = loader.getKey(this.manifestKey, rightName);
                const leftTex = this.scene.textures.get(leftTexKey);
                const rightTex = this.scene.textures.get(rightTexKey);
                const lw = leftTex ? leftTex.getSourceImage().width : 124;
                const rw = rightTex ? rightTex.getSourceImage().width : 124;

                const leftX = MARGIN + lw / 2;
                this.sprites.leftArrow = this.scene.add.image(leftX, centerY, leftTexKey)
                    .setDepth(this.depth)
                    .setInteractive();
                this.sprites.leftArrow.on('pointerdown', () => this._navigatePeer(-1));
                this.sprites.leftArrow.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
                this.sprites.leftArrow.on('pointerout', () => this.scene.input.setDefaultCursor('default'));

                const rightX = CANVAS_W - MARGIN - rw / 2;
                this.sprites.rightArrow = this.scene.add.image(rightX, centerY, rightTexKey)
                    .setDepth(this.depth)
                    .setInteractive();
                this.sprites.rightArrow.on('pointerdown', () => this._navigatePeer(1));
                this.sprites.rightArrow.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
                this.sprites.rightArrow.on('pointerout', () => this.scene.input.setDefaultCursor('default'));
            } else {
                const arrowsName = prefix + '/左右场景切换.png';
                const arrowsInfo = loader.getAssetInfo(this.manifestKey, arrowsName);

                if (arrowsInfo) {
                    this.sprites.arrows = this.factory.create(this.manifestKey, arrowsName, {
                        depth: this.depth
                    });

                    const pos = loader.getPosition(this.manifestKey, arrowsName);
                    const halfW = pos.width / 2;
                    const zoneH = pos.height;

                    this.sprites.leftZone = this.factory.createHitZone(
                        pos.x - halfW / 2, pos.y,
                        halfW, zoneH,
                        () => this._navigatePeer(-1),
                        this.depth + 1
                    );
                    this.sprites.rightZone = this.factory.createHitZone(
                        pos.x + halfW / 2, pos.y,
                        halfW, zoneH,
                        () => this._navigatePeer(1),
                        this.depth + 1
                    );
                }
            }
        }

        if (this.config.showBack) {
            const backName = prefix + '/退到上一个场景箭头.png';
            const backInfo = loader.getAssetInfo(this.manifestKey, backName);
            if (backInfo) {
                this.sprites.back = this.factory.createInteractive(
                    this.manifestKey, backName,
                    () => this._navigateBack(),
                    { depth: this.depth + 1 }
                );
            }
        }
    }

    _navigatePeer(direction) {
        if (QW.TransitionManager.isTransitioning) return;

        if (direction === -1 && this.config.leftTarget) {
            QW.TransitionManager.goto(this.scene, this.config.leftTarget);
            return;
        }
        if (direction === 1 && this.config.rightTarget) {
            QW.TransitionManager.goto(this.scene, this.config.rightTarget);
            return;
        }

        const peers = this.config.useLivingRoomPeers
            ? QW.GameState.getLivingRoomPeers()
            : this.config.peers;
        const current = this.config.currentScene;
        const idx = peers.indexOf(current);
        if (idx === -1) return;

        const nextIdx = (idx + direction + peers.length) % peers.length;
        QW.TransitionManager.goto(this.scene, peers[nextIdx]);
    }

    _navigateBack() {
        if (QW.TransitionManager.isTransitioning) return;

        if (this.config.backTargetScene) {
            QW.TransitionManager.goto(this.scene, this.config.backTargetScene);
            return;
        }

        const prevScene = QW.GameState.popScene();
        if (prevScene) {
            QW.TransitionManager.goto(this.scene, prevScene);
        }
    }

    setVisible(visible) {
        Object.values(this.sprites).forEach(s => {
            if (s) s.setVisible(visible);
        });
    }

    destroy() {
        Object.values(this.sprites).forEach(s => {
            if (s) s.destroy();
        });
    }
};
