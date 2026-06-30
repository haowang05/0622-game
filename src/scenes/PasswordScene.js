/**
 * S15 - 密码/抽屉特写
 * manifest key: '19'
 * 密码输入面板：输入 2513 打开抽屉获取锤子和钉子。
 * P1 stub：显示背景 + 密码面板，无实际输入功能。
 *          点击背景即可模拟密码正确，获取道具。
 */
window.QW = window.QW || {};

QW.PasswordScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Password' });
        this.MANIFEST_KEY = '19';
        this.currentPassword = [0, 0, 0, 0];
        this.passwordSlots = [];
        this.passwordZones = [];
        this.passwordDigits = [];
        this.isUnlocking = false;
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.isUnlocking = false;

        // 背景
        factory.createBackground(this.MANIFEST_KEY);

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 返回箭头
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true
        });

        if (GS.getFlag('passwordLooted')) {
            // 领取锤子和钉子后，抽屉保持为空
            factory.create(this.MANIFEST_KEY, '19/空抽屉.png');
            console.log('[S15] Drawer already looted, showing empty drawer');
        } else if (GS.getFlag('passwordSolved')) {
            this._renderOpenedDrawer(factory);
        } else {
            this._renderLockedPasswordPanel(factory);
        }

        QW.TransitionManager.finishEnter(this);
    }

    /**
     * 密码未解：显示密码面板，默认 0000，点击每一位循环 0~9
     */
    _renderLockedPasswordPanel(factory) {
        const GS = QW.GameState;
        factory.create(this.MANIFEST_KEY, '19/密码0-9/空.png', { depth: 50 });

        this.currentPassword = GS.getFlag('passwordReadyToOpen') ? [2, 5, 1, 3] : [0, 0, 0, 0];
        this._createPasswordSlots();
        this._renderPasswordDigits();
        console.log('[S15] Password locked, current:', this.currentPassword.join(''));

        // 输入正确后，需再点击一次抽屉区域才开抽屉
        if (GS.getFlag('passwordReadyToOpen')) {
            this.passwordZones.forEach((zone) => zone && zone.disableInteractive());
            const panelPos = QW.AssetLoaderInstance.getPosition(this.MANIFEST_KEY, '19/密码0-9/空.png');
            if (panelPos) {
                this.add.zone(panelPos.x, panelPos.y, panelPos.width * 0.86, panelPos.height * 0.9)
                    .setDepth(75)
                    .setInteractive()
                    .on('pointerdown', () => {
                        if (QW.AudioManager) QW.AudioManager.playDoor(this);
                        GS.setFlag('passwordSolved', true);
                        GS.setFlag('passwordReadyToOpen', false);
                        this.scene.restart();
                    });
            }
        }
    }

    _createPasswordSlots() {
        const panelPos = QW.AssetLoaderInstance.getPosition(this.MANIFEST_KEY, '19/密码0-9/空.png');
        if (!panelPos) return;

        // 四位密码位于密码框中央区域
        // 第一位数字向左微调，避免视觉上偏右
        const slotOffsets = [-168, -55, 55, 165];
        this.passwordSlots = slotOffsets.map((dx) => ({ x: panelPos.x + dx, y: panelPos.y + 4 }));

        this.passwordZones.forEach((zone) => zone && zone.destroy());
        this.passwordZones = [];

        this.passwordSlots.forEach((slot, index) => {
            const zone = this.add.zone(slot.x, slot.y, 120, 150).setDepth(70).setInteractive();
            zone.on('pointerdown', () => this._incrementPasswordDigit(index));
            zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
            zone.on('pointerout', () => this.input.setDefaultCursor('default'));
            this.passwordZones.push(zone);
        });
    }

    _renderPasswordDigits() {
        this.passwordDigits.forEach((sprite) => sprite && sprite.destroy());
        this.passwordDigits = [];

        this.currentPassword.forEach((digit, index) => {
            const key = QW.AssetLoaderInstance.getKey(this.MANIFEST_KEY, `19/密码0-9/${digit}.png`);
            const slot = this.passwordSlots[index];
            if (!key || !slot) return;

            const sprite = this.add.image(slot.x, slot.y, key).setDepth(65);
            this.passwordDigits.push(sprite);
        });
    }

    _incrementPasswordDigit(index) {
        if (this.isUnlocking) return;
        this.currentPassword[index] = (this.currentPassword[index] + 1) % 10;
        this._renderPasswordDigits();

        const code = this.currentPassword.join('');
        console.log('[S15] Password input:', code);
        if (code === '2513') {
            console.log('[S15] Password accepted: 2513');
            this.isUnlocking = true;
            this.passwordZones.forEach((zone) => zone && zone.disableInteractive());
            this.time.delayedCall(2000, () => {
                QW.GameState.setFlag('passwordReadyToOpen', true);
                this.scene.restart();
            });
        }
    }

    /**
     * 密码已解：显示开抽屉
     * 首次点击抽屉打开日记弹窗；再次点击一次性领取锤子和钉子
     */
    _renderOpenedDrawer(factory) {
        factory.createInteractive(this.MANIFEST_KEY, '19/开抽屉.png',
            () => {
                this._handleOpenedDrawerClick();
            },
            { depth: 45, playClick: false }
        );
    }

    _handleOpenedDrawerClick() {
        const GS = QW.GameState;

        if (!GS.getFlag('diaryRead')) {
            GS.setFlag('diaryRead', true);
            console.log('[S15] First drawer click → show diary popup');
            QW.showPhotoPopup(this, {
                manifestKey: this.MANIFEST_KEY,
                containerName: '19/日记弹窗.png',
                closeName: '19/X.png',
                dimAlpha: 0.5
            });
            return;
        }

        if (!GS.getFlag('passwordLooted')) {
            console.log('[S15] Second drawer click → acquire hammer and nail');
            GS.addItem('hammer');
            GS.addItem('nail');
            GS.setFlag('passwordLooted', true);
            this.scene.restart();
        }
    }
};
