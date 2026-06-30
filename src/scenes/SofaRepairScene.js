/**
 * S16 - 修复沙发
 * manifest key: '22'
 * 使用所有收集到的材料和工具修复沙发。
 * 修复步骤：锯子+木头 → 钉子 → 锤子 → 点击3下。
 * P1 stub：显示背景和坏/好沙发，点击沙发直接跳到结局。
 */
window.QW = window.QW || {};

QW.SofaRepairScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'SofaRepair' });
        this.MANIFEST_KEY = '22';
        this._advanceBlockedUntil = 0;
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;

        factory.createBackground(this.MANIFEST_KEY);

        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 修沙发弹窗主界面
        const popupAsset = GS.getFlag('sofaRepaired')
            ? '22/修沙发/修完沙发.png'
            : '22/修沙发/修沙发弹窗.png';
        factory.create(this.MANIFEST_KEY, popupAsset, { depth: 20 });

        // 关闭按钮（修复后用于关闭弹窗+OS）
        factory.createInteractive(this.MANIFEST_KEY, '22/修沙发/X修沙发弹窗.png',
            () => {
                console.log('[S16] Close repair popup → LivingRoomA');
                QW.TransitionManager.goto(this, 'LivingRoomA');
            },
            { depth: 120 }
        );

        if (GS.getFlag('sofaRepaired')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/修好沙发os.png', { depth: 110 });
            QW.TransitionManager.finishEnter(this);
            return;
        }

        this._renderRepairProgress(factory, GS);
        this._bindRepairInteraction(factory, GS);

        QW.TransitionManager.finishEnter(this);
    }

    _renderRepairProgress(factory, GS) {
        const depthBase = 40;

        if (GS.getFlag('sofaWoodPlaced') && !GS.getFlag('sofaWoodSplit')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/木头原.png', { depth: depthBase + 1 });
        }
        if (GS.getFlag('sofaSawPlaced') && !GS.getFlag('sofaWoodSplit')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/锯子原.png', { depth: depthBase + 2 });
        }
        if (GS.getFlag('sofaWoodSplit') && !GS.getFlag('sofaWoodResidual') && !GS.getFlag('sofaWoodMounted')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/锯子锯完.png', { depth: depthBase + 3 });
            factory.create(this.MANIFEST_KEY, '22/修沙发/木头分开.png', { depth: depthBase + 4 });
        }
        if (GS.getFlag('sofaWoodResidual') && !GS.getFlag('sofaWoodMounted')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/留下的木料.png', { depth: depthBase + 5 });
        }
        if (GS.getFlag('sofaWoodMounted')) {
            factory.create(this.MANIFEST_KEY, '22/修沙发/拖动吸附到椅子腿上的木料原.png', { depth: depthBase + 6 });
        }

        if (GS.getFlag('sofaNailPlaced')) {
            if (GS.flags.sofaNailHits >= 2) {
                factory.create(this.MANIFEST_KEY, '22/修沙发/钉子定好.png', { depth: depthBase + 8 });
            } else if (GS.flags.sofaNailHits === 1) {
                factory.create(this.MANIFEST_KEY, '22/修沙发/钉子2.png', { depth: depthBase + 8 });
            } else {
                factory.create(this.MANIFEST_KEY, '22/修沙发/钉子原.png', { depth: depthBase + 8 });
            }
        }

        if (GS.getFlag('sofaHammerPlaced')) {
            if (GS.flags.sofaNailHits === 1) {
                factory.create(this.MANIFEST_KEY, '22/修沙发/锤子动.png', { depth: depthBase + 9 });
            } else if (GS.flags.sofaNailHits < 2) {
                factory.create(this.MANIFEST_KEY, '22/修沙发/锤子原.png', { depth: depthBase + 9 });
            }
        }
    }

    _bindRepairInteraction(factory, GS) {
        const sofaPos = QW.AssetLoaderInstance.getPosition(this.MANIFEST_KEY, '22/坏沙发.png') || {
            x: 1460, y: 1120, width: 1150, height: 560
        };

        factory.createHitZone(
            sofaPos.x,
            sofaPos.y,
            sofaPos.width * 0.8,
            sofaPos.height * 0.85,
            () => {
                const selected = this.inventoryDisplay ? this.inventoryDisplay.getSelected() : null;
                if (!selected) return;

                if (!GS.getFlag('sofaWoodPlaced') && selected === 'wood') {
                    this._advanceBlockedUntil = this.time.now + 180;
                    GS.setFlag('sofaWoodPlaced', true);
                    this.scene.restart();
                    return;
                }
            },
            100
        );

        // 点击屏幕推进切木与敲钉子步骤
        this.input.on('pointerdown', () => {
            if (QW.TransitionManager.isTransitioning) return;
            if (this.time.now < this._advanceBlockedUntil) return;

            const selected = this.inventoryDisplay ? this.inventoryDisplay.getSelected() : null;

            if (GS.getFlag('sofaWoodPlaced') && !GS.getFlag('sofaSawPlaced') && selected === 'saw') {
                GS.setFlag('sofaSawPlaced', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaSawPlaced') && !GS.getFlag('sofaWoodSplit')) {
                if (QW.AudioManager) QW.AudioManager.playSaw(this);
                GS.setFlag('sofaWoodSplit', true);
                GS.setFlag('sofaWoodCut', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaWoodSplit') && !GS.getFlag('sofaWoodResidual')) {
                GS.setFlag('sofaWoodResidual', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaWoodResidual') && !GS.getFlag('sofaWoodMounted')) {
                GS.setFlag('sofaWoodMounted', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaWoodMounted') && !GS.getFlag('sofaNailPlaced') && selected === 'nail') {
                GS.setFlag('sofaNailPlaced', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaNailPlaced') && !GS.getFlag('sofaHammerPlaced') && selected === 'hammer') {
                GS.setFlag('sofaHammerPlaced', true);
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaNailPlaced') && GS.getFlag('sofaHammerPlaced') && GS.flags.sofaNailHits === 0) {
                GS.flags.sofaNailHits = 1;
                this.scene.restart();
                return;
            }

            if (GS.getFlag('sofaNailPlaced') && GS.getFlag('sofaHammerPlaced') && GS.flags.sofaNailHits === 1) {
                GS.flags.sofaNailHits = 2;
                GS.setFlag('sofaRepaired', true);
                this.scene.restart();
            }
        });
    }
};
