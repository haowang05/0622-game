/**
 * S6 - 客厅A面（书架与沙发）
 * manifest key: '8'
 * 客厅三面循环切换的第一面。
 *   - 书架 → 弹出照片弹窗（P1 stub）
 *   - 沙发 → 查看破损状态（P1 stub → SofaRepair 用于测试）
 */
window.QW = window.QW || {};

QW.LivingRoomAScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'LivingRoomA' });
        this.MANIFEST_KEY = '8';
        this._endingState = 'idle';
        this._endingSprites = {};
        this._typedText = '';
        this._cursorVisible = true;
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        QW.AssetLoaderInstance.loadSceneAssets('22');
        // 背包道具图标（木头/锯子）跨场景显示
        QW.AssetLoaderInstance.loadSceneAssets('13');
        QW.AssetLoaderInstance.loadSceneAssets('15');
        QW.AssetLoaderInstance.loadSceneAssets('23最终');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.factory = factory;
        this.GS = GS;
        this._repairHintShown = false;
        this._endingState = 'idle';
        this._endingSprites = {};
        this._typedText = '';
        this._cursorVisible = true;
        this._cursorTimer = null;
        this._typingTextObj = null;

        const isLitLivingRoom = GS.getFlag('pondLitUp');
        const sceneManifest = isLitLivingRoom ? '22' : this.MANIFEST_KEY;
        const bookshelfAsset = isLitLivingRoom ? '22/书架.png' : '8/书架.png';
        const sofaAsset = isLitLivingRoom
            ? (GS.getFlag('sofaRepaired') ? '22/好沙发.png' : '22/坏沙发.png')
            : '8/沙发.png';

        // 背景（池塘点亮后切换到22亮态素材）
        this.backgroundSprite = factory.createBackground(sceneManifest);

        // 菜单栏
        this.menuBar = new QW.MenuBar(this, factory, sceneManifest);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, sceneManifest);

        // 左右箭头（客厅三面循环：B[左] ← A[中] → C[右]）
        this.navigationArrows = new QW.NavigationArrows(this, factory, sceneManifest, {
            useLivingRoomPeers: true,
            currentScene: 'LivingRoomA'
        });

        // 书架（可点击 → 照片弹窗）- depth设为50，确保低于弹窗
        this.bookshelfSprite = factory.createInteractive(sceneManifest, bookshelfAsset,
            () => {
                console.log('[S6] Bookshelf clicked → show photo popup');
                QW.showPhotoPopup(this, {
                    manifestKey: sceneManifest,
                    containerName: isLitLivingRoom ? '22/照片弹窗.png' : '8/照片弹窗.png',
                    closeName: isLitLivingRoom ? '22/X.png' : '8/X.png',
                    dimAlpha: 0.5
                });
            },
            { depth: 50 }
        );

        // 沙发（亮态后可进入修沙发弹窗流程）
        this.sofaSprite = factory.createInteractive(sceneManifest, sofaAsset,
            () => {
                if (isLitLivingRoom && GS.getFlag('sofaRepaired')) {
                    console.log('[S6] Sofa already repaired');
                    return;
                }

                if (isLitLivingRoom && this._hasAllRepairItems()) {
                    if (!this._repairHintShown) {
                        this._repairHintShown = true;
                        this._showTransientHint(factory, '22', '22/修沙发/提示修沙发.png', 3000);
                        return;
                    }

                    QW.TransitionManager.gotoImmediate(this, 'SofaRepair');
                    return;
                }

                this._showTransientHint(factory, this.MANIFEST_KEY, '8/提示.png', 3000);
                if (QW.AudioManager) QW.AudioManager.playSigh(this);
            },
            { depth: 50 }
        );

        this.cameraSprite = null;
        if (isLitLivingRoom && GS.getFlag('sofaRepaired')) {
            this.cameraSprite = factory.createInteractive('22', '22/相机.png',
                () => {
                    QW.showPhotoPopup(this, {
                        manifestKey: '22',
                        containerName: '22/修好沙发照片弹窗.png',
                        closeName: '22/X修好沙发照片.png',
                        dimAlpha: 0.55,
                        onClose: () => {
                            GS.setFlag('endingNotebookUnlocked', true);
                            this._showEndingNotebookIcon();
                        }
                    });
                },
                { depth: 95 }
            );
        }

        if (GS.getFlag('endingNotebookUnlocked')) {
            this._showEndingNotebookIcon();
        }

        this._boundKeyHandler = (event) => this._handleEndingTyping(event);
        this.input.keyboard.on('keydown', this._boundKeyHandler);
        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown', this._boundKeyHandler);
            if (this._cursorTimer) {
                this._cursorTimer.remove(false);
                this._cursorTimer = null;
            }
        });

        QW.TransitionManager.finishEnter(this);
    }

    _hasAllRepairItems() {
        const GS = QW.GameState;
        return GS.hasItem('wood') &&
            GS.hasItem('saw') &&
            GS.hasItem('hammer') &&
            GS.hasItem('nail');
    }

    _showTransientHint(factory, manifestKey, assetName, durationMs) {
        const hintSprite = factory.create(manifestKey, assetName, {
            depth: 150,
            alpha: 0
        });
        if (!hintSprite) return;

        this.tweens.add({
            targets: hintSprite,
            alpha: 1,
            duration: 220,
            ease: 'Power2'
        });

        this.time.delayedCall(durationMs, () => {
            this.tweens.add({
                targets: hintSprite,
                alpha: 0,
                duration: 420,
                ease: 'Power2',
                onComplete: () => hintSprite.destroy()
            });
        });
    }

    _showEndingNotebookIcon() {
        if (this.menuBar && this.menuBar.sprites && this.menuBar.sprites.note) {
            this.menuBar.sprites.note.setVisible(false);
            this.menuBar.sprites.note.disableInteractive();
        }
        if (this._endingSprites.notebookIcon && this._endingSprites.notebookIcon.active) return;

        this._endingSprites.notebookIcon = this.factory.createInteractive(
            '23最终',
            '23最终/打开的本子图标.png',
            () => this._startEndingSequence(),
            { depth: 140 }
        );
    }

    _startEndingSequence() {
        if (this._endingState !== 'idle') return;
        this._endingState = 'content';
        this._hideGameplayForEnding();

        this._endingSprites.blocker = this.add.rectangle(1400, 920, 2800, 1840, 0x000000, 1)
            .setDepth(180)
            .setInteractive();
        this._endingSprites.blocker.on('pointerdown', () => this._advanceEndingSequence());

        this._endingSprites.content = this.factory.create('23最终', '23最终/内容.png', { depth: 200 });
    }

    _advanceEndingSequence() {
        if (QW.TransitionManager.isTransitioning) return;

        if (this._endingState === 'content') {
            this._endingState = 'stamp';
            this._endingSprites.stamp = this.factory.create('23最终', '23最终/盖章.png', { depth: 201 });
            return;
        }

        if (this._endingState === 'stamp') {
            this._endingState = 'jumpPrompt';
            this._endingSprites.jumpPrompt = this.factory.create('23最终', '23最终/跳转文本框提示.png', { depth: 202 });
            return;
        }

        if (this._endingState === 'jumpPrompt') {
            this._destroyEndingSprite('content');
            this._destroyEndingSprite('stamp');
            this._destroyEndingSprite('jumpPrompt');
            this._endingState = 'textBg';
            this._endingSprites.textBg = this.factory.create('23最终', '23最终/文本框背景.png', { depth: 203 });
            return;
        }

        if (this._endingState === 'textBg') {
            this._endingState = 'typing';
            this._endingSprites.textInput = this.factory.create('23最终', '23最终/文本框输入.png', { depth: 204 });
            this._endingSprites.submit = this.factory.createInteractive(
                '23最终',
                '23最终/文本框√.png',
                () => this._submitEndingText(),
                { depth: 205 }
            );
            this._typedText = '';
            this._createTypingTextAndCursor();
            return;
        }
    }

    _advanceToSummary() {
        if (this._endingState !== 'submitted') return;

        this._destroyEndingSprite('textBg');
        this._destroyEndingSprite('textInput');
        this._destroyEndingSprite('submit');
        if (this._typingTextObj) {
            this._typingTextObj.destroy();
            this._typingTextObj = null;
        }
        this._endingState = 'summary';
        this._endingSprites.summary = this.factory.create('23最终', '23最终/总结.png', { depth: 210 });
        if (!this._endingSprites.summary) {
            console.error('[S6] Failed to create summary sprite');
        }
        this.GS.setFlag('gameCompleted', true);
    }

    _hideGameplayForEnding() {
        if (this.backgroundSprite) this.backgroundSprite.setVisible(false);
        if (this.menuBar) this.menuBar.setVisible(false);
        if (this.navigationArrows) this.navigationArrows.setVisible(false);

        if (this.inventoryDisplay && this.inventoryDisplay.sprites) {
            Object.values(this.inventoryDisplay.sprites).forEach((sprite) => {
                if (!sprite) return;
                sprite.setVisible(false);
                sprite.disableInteractive();
            });
        }

        [this.bookshelfSprite, this.sofaSprite, this.cameraSprite, this._endingSprites.notebookIcon].forEach((sprite) => {
            if (!sprite) return;
            sprite.setVisible(false);
            if (sprite.disableInteractive) sprite.disableInteractive();
        });
    }

    _createTypingTextAndCursor() {
        const pos = QW.AssetLoaderInstance.getPosition('23最终', '23最终/文本框输入.png') || {
            x: 1400,
            y: 920,
            width: 1200
        };
        this._typingTextObj = this.add.text(
            pos.x - (pos.width * 0.34),
            pos.y - 36,
            '',
            {
                fontSize: '88px',
                color: '#222222',
                fontFamily: 'Arial, sans-serif'
            }
        ).setDepth(206);
        this._cursorVisible = true;
        this._refreshTypingText();

        this._cursorTimer = this.time.addEvent({
            delay: 450,
            loop: true,
            callback: () => {
                if (this._endingState !== 'typing') return;
                this._cursorVisible = !this._cursorVisible;
                this._refreshTypingText();
            }
        });
    }

    _handleEndingTyping(event) {
        if (this._endingState !== 'typing') return;
        if (!this._typingTextObj) return;

        if (event.key === 'Backspace') {
            this._typedText = this._typedText.slice(0, -1);
        } else if (event.key === 'Enter') {
            this._submitEndingText();
            return;
        } else if (event.key && event.key.length === 1) {
            if (this._typedText.length >= 42) return;
            this._typedText += event.key;
        } else {
            return;
        }
        this._refreshTypingText();
    }

    _refreshTypingText() {
        if (!this._typingTextObj) return;
        const cursor = this._cursorVisible ? '|' : ' ';
        this._typingTextObj.setText(this._typedText + cursor);
    }

    _submitEndingText() {
        if (this._endingState !== 'typing') return;
        this._endingState = 'submitted';

        if (this._cursorTimer) {
            this._cursorTimer.remove(false);
            this._cursorTimer = null;
        }
        this._cursorVisible = false;
        if (this._typingTextObj) {
            this._typingTextObj.setText(this._typedText);
        }

        if (this._endingSprites.submit) {
            const stampedButtonKey = QW.AssetLoaderInstance.getKey('23最终', '23最终/文本框章.png');
            if (stampedButtonKey) {
                this._endingSprites.submit.setTexture(stampedButtonKey);
            }
            this._endingSprites.submit.disableInteractive();
        }
        this.GS.setFlag('gameCompleted', true);
        if (this._endingSprites.blocker) {
            this._endingSprites.blocker.disableInteractive();
            this._endingSprites.blocker.removeAllListeners('pointerdown');
        }
    }

    _destroyEndingSprite(key) {
        const sprite = this._endingSprites[key];
        if (!sprite) return;
        if (typeof sprite.destroy === 'function') sprite.destroy();
        this._endingSprites[key] = null;
    }
};
