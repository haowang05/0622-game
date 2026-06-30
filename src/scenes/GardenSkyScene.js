/**
 * S10 - 花园仰望视角（蓝天/白云/小花）
 * manifest key: '13'
 * 点亮谜题：5朵花 + 3朵云，任意顺序点击。
 * 全部点亮后 → 相机出现 → 拍照 → 第二段 OS + 发现木头。
 * P1 stub：渲染背景 + 花/云原始态 + 返回箭头。
 */
window.QW = window.QW || {};

QW.GardenSkyScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'GardenSky' });
        this.MANIFEST_KEY = '13';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        // 背包中锯子图标跨场景显示
        QW.AssetLoaderInstance.loadSceneAssets('15');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.cameraSprite = null;
        this.inventoryDisplay = null;
        this.backgroundSprite = null;
        this._cloudTweens = [];

        // 花园全部点亮后，标记花园阶段完成（用于入口场景切换亮背景）
        if (GS.allGardenLit()) {
            GS.setFlag('gardenComplete', true);
        }

        // 背景（全部点亮后持久替换为 13/亮背景.png）
        if (GS.getFlag('gardenComplete') || GS.allGardenLit()) {
            this.backgroundSprite = factory.createBackground(this.MANIFEST_KEY, '13/亮背景.png');
        } else {
            this.backgroundSprite = factory.createBackground(this.MANIFEST_KEY, '13/背景.png');
        }

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 返回箭头
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true
        });

        // 花朵 × 5
        const flowerNames = ['花1.png', '花2.png', '花3.png', '花4.png', '花5.png'];
        const flowerLitNames = ['花亮1.png', '花亮2.png', '花亮3.png', '花亮4.png', '花亮5.png'];

        for (let i = 0; i < 5; i++) {
            if (GS.flags.flowersLit[i]) {
                factory.create(this.MANIFEST_KEY, `13/${flowerLitNames[i]}`);
            } else {
                const idx = i; // capture for closure
                const flowerSprite = factory.createInteractive(this.MANIFEST_KEY, `13/${flowerNames[i]}`,
                    () => {
                        console.log(`[S10] Flower ${idx + 1} lit`);
                        GS.flags.flowersLit[idx] = true;
                        if (flowerSprite) flowerSprite.destroy();
                        factory.create(this.MANIFEST_KEY, `13/${flowerLitNames[idx]}`);
                        this._onGardenLightProgress(factory);
                    }
                );
            }
        }

        // 云朵 × 3
        const cloudNames = ['云1.png', '云2.png', '云3.png'];
        const cloudLitNames = ['云亮1.png', '云亮2.png', '云亮3.png'];

        for (let i = 0; i < 3; i++) {
            if (GS.flags.cloudsLit[i]) {
                const litCloud = factory.create(this.MANIFEST_KEY, `13/${cloudLitNames[i]}`);
                this._attachCloudFloat(litCloud, i);
            } else {
                const idx = i;
                const cloudSprite = factory.createInteractive(this.MANIFEST_KEY, `13/${cloudNames[i]}`,
                    () => {
                        console.log(`[S10] Cloud ${idx + 1} lit`);
                        GS.flags.cloudsLit[idx] = true;
                        if (cloudSprite) cloudSprite.destroy();
                        const litCloud = factory.create(this.MANIFEST_KEY, `13/${cloudLitNames[idx]}`);
                        this._attachCloudFloat(litCloud, idx);
                        this._onGardenLightProgress(factory);
                    }
                );
                this._attachCloudFloat(cloudSprite, idx);
            }
        }

        // 全部点亮后 → 显示相机（拿到木头前都可再次打开照片）
        if (GS.allGardenLit() && !GS.getFlag('woodAcquired')) {
            this.cameraSprite = factory.createInteractive(this.MANIFEST_KEY, '13/相机.png',
                () => this._takeGardenPhoto(),
                { depth: 100 }
            );
        }

        QW.TransitionManager.finishEnter(this);
    }

    _attachCloudFloat(sprite, index) {
        if (!sprite) return;
        const driftX = [30, -36, 32][index % 3];
        const driftY = [14, 10, 16][index % 3];
        const duration = [3800, 4300, 4000][index % 3];
        const tween = this.tweens.add({
            targets: sprite,
            x: sprite.x + driftX,
            y: sprite.y + driftY,
            duration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this._cloudTweens.push(tween);
    }

    _takeGardenPhoto() {
        const GS = QW.GameState;

        console.log('[S10] Camera clicked → show popup photo + OS');
        GS.setFlag('gardenPhotoTaken', true);
        GS.flags.photosTaken++;

        // 当前场景先隐藏相机，防止弹窗期间仍可见
        if (this.cameraSprite) {
            this.cameraSprite.disableInteractive();
            this.cameraSprite.setVisible(false);
        }

        // 弹窗内同时显示OS，木头在最上层并可点击获取
        const overlayNames = ['13/OS.png'];
        const overlayInteractions = {};

        if (!GS.getFlag('woodAcquired')) {
            // 后加入数组，确保木头在OS之上
            overlayNames.push('13/木头（照片上.png');
            overlayInteractions['13/木头（照片上.png'] = () => {
                if (GS.getFlag('woodAcquired')) return;
                console.log('[S10] Wood acquired from photo popup');
                GS.addItem('wood');
                GS.setFlag('woodAcquired', true);
                if (this.inventoryDisplay) this.inventoryDisplay.refresh();

                // 需求：木头一旦入包，立刻从当前照片弹窗中消失（不自动关窗）
                if (this.scene.isActive('PopupScene')) {
                    const popupScene = this.scene.get('PopupScene');
                    const woodTextureKey = QW.AssetLoaderInstance.getKey('13', '13/木头（照片上.png');
                    if (popupScene && Array.isArray(popupScene.sprites && popupScene.sprites.overlays)) {
                        popupScene.sprites.overlays = popupScene.sprites.overlays.filter((sprite) => {
                            const isWood = sprite && sprite.texture && sprite.texture.key === woodTextureKey;
                            if (isWood && typeof sprite.destroy === 'function') {
                                sprite.destroy();
                                return false;
                            }
                            return true;
                        });
                    }
                }
            };
        }

        QW.showPhotoPopup(this, {
            manifestKey: this.MANIFEST_KEY,
            containerName: '13/照片弹窗背景.png',
            closeName: '13/X.png',
            dimAlpha: 0.5,
            overlayNames,
            overlayInteractions,
            onClose: () => this.scene.restart()
        });
    }

    _onGardenLightProgress(factory) {
        const GS = QW.GameState;
        if (!GS.allGardenLit()) return;

        GS.setFlag('gardenComplete', true);

        // 无缝替换亮背景，不重启场景
        const litBgKey = QW.AssetLoaderInstance.getKey(this.MANIFEST_KEY, '13/亮背景.png');
        if (this.backgroundSprite && litBgKey) {
            this.backgroundSprite.setTexture(litBgKey);
        }

        this._ensureCameraIcon(factory);
    }

    _ensureCameraIcon(factory) {
        const GS = QW.GameState;
        if (!GS.allGardenLit() || GS.getFlag('woodAcquired')) return;
        if (this.cameraSprite && this.cameraSprite.active) return;

        this.cameraSprite = factory.createInteractive(this.MANIFEST_KEY, '13/相机.png',
            () => this._takeGardenPhoto(),
            { depth: 100 }
        );
    }
};
