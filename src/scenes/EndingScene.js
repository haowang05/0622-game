/**
 * S17 - 结局（笔记本特写）
 * manifest key: '23最终'
 * 顺序：
 * 1) 打开的本子图标 -> 内容
 * 2) 点击屏幕 -> 盖章
 * 3) 点击屏幕 -> 跳转文本框提示
 * 4) 点击屏幕 -> 文本框背景
 * 5) 点击屏幕 -> 文本框输入 + 提交按钮，允许键盘输入
 * 6) 点击提交 -> 按钮变章，保留输入文字
 * 7) 点击屏幕 -> 总结
 */
window.QW = window.QW || {};

QW.EndingScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Ending' });
        this.MANIFEST_KEY = '23最终';
        this.stage = 'awaitNotebookClick';
        this.storySprites = {};
        this.typedText = '';
        this.inputTextObj = null;
        this.menuBar = null;
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.factory = factory;
        this.GS = GS;

        this.menuBar = new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        if (this.menuBar.sprites.note) {
            this.menuBar.sprites.note.setVisible(false);
        }

        const iconAsset = GS.getFlag('endingNotebookUnlocked')
            ? '23最终/打开的本子图标.png'
            : '23最终/笔记.png';

        this.storySprites.notebookIcon = factory.createInteractive(
            this.MANIFEST_KEY,
            iconAsset,
            () => this._openNotebook(),
            { depth: 130 }
        );

        this._pointerHandler = () => this._onStagePointer();
        this.input.on('pointerdown', this._pointerHandler);
        this.input.keyboard.on('keydown', this._handleKeyInput, this);

        this.events.once('shutdown', () => {
            if (this._pointerHandler) {
                this.input.off('pointerdown', this._pointerHandler);
                this._pointerHandler = null;
            }
            this.input.keyboard.off('keydown', this._handleKeyInput, this);
        });

        QW.TransitionManager.finishEnter(this);
    }

    _openNotebook() {
        if (this.stage !== 'awaitNotebookClick') return;
        this.stage = 'content';
        this._safeDestroy('notebookIcon');
        this.storySprites.content = this.factory.create(this.MANIFEST_KEY, '23最终/内容.png', { depth: 20 });
    }

    _onStagePointer() {
        if (QW.TransitionManager.isTransitioning) return;

        if (this.stage === 'content') {
            this.stage = 'stamp';
            this.storySprites.stamp = this.factory.create(this.MANIFEST_KEY, '23最终/盖章.png', { depth: 21 });
            return;
        }

        if (this.stage === 'stamp') {
            this.stage = 'jumpPrompt';
            this.storySprites.jumpPrompt = this.factory.create(this.MANIFEST_KEY, '23最终/跳转文本框提示.png', { depth: 22 });
            return;
        }

        if (this.stage === 'jumpPrompt') {
            this._clearStoryChain();
            this.stage = 'textBackground';
            this.storySprites.textBg = this.factory.create(this.MANIFEST_KEY, '23最终/文本框背景.png', { depth: 23 });
            return;
        }

        if (this.stage === 'textBackground') {
            this.stage = 'typing';
            this.storySprites.textInput = this.factory.create(this.MANIFEST_KEY, '23最终/文本框输入.png', { depth: 24 });
            this.storySprites.submitButton = this.factory.createInteractive(
                this.MANIFEST_KEY,
                '23最终/文本框√.png',
                () => this._submitInput(),
                { depth: 25 }
            );
            this._createInputText();
            return;
        }

        if (this.stage === 'submitted') {
            this._clearInputStage();
            this.stage = 'summary';
            this.storySprites.summary = this.factory.create(this.MANIFEST_KEY, '23最终/总结.png', { depth: 30 });
            this.GS.setFlag('gameCompleted', true);
        }
    }

    _createInputText() {
        const pos = QW.AssetLoaderInstance.getPosition(this.MANIFEST_KEY, '23最终/文本框输入.png') || {
            x: 1400,
            y: 920,
            width: 1000
        };
        this.inputTextObj = this.add.text(
            pos.x - (pos.width * 0.33),
            pos.y - 16,
            '',
            {
                fontSize: '44px',
                color: '#222222',
                fontFamily: 'Arial, sans-serif'
            }
        ).setDepth(26);
    }

    _handleKeyInput(event) {
        if (this.stage !== 'typing') return;

        if (event.key === 'Backspace') {
            this.typedText = this.typedText.slice(0, -1);
        } else if (event.key === 'Enter') {
            this._submitInput();
            return;
        } else if (event.key && event.key.length === 1) {
            if (this.typedText.length >= 40) return;
            this.typedText += event.key;
        } else {
            return;
        }

        if (this.inputTextObj) {
            this.inputTextObj.setText(this.typedText);
        }
    }

    _submitInput() {
        if (this.stage !== 'typing') return;
        this.stage = 'submitted';

        const button = this.storySprites.submitButton;
        if (button) {
            button.disableInteractive();
            const textureKey = QW.AssetLoaderInstance.getKey(this.MANIFEST_KEY, '23最终/文本框章.png');
            if (textureKey) button.setTexture(textureKey);
        }
    }

    _clearStoryChain() {
        this._safeDestroy('content');
        this._safeDestroy('stamp');
        this._safeDestroy('jumpPrompt');
    }

    _clearInputStage() {
        this._safeDestroy('textBg');
        this._safeDestroy('textInput');
        this._safeDestroy('submitButton');
        if (this.inputTextObj) {
            this.inputTextObj.destroy();
            this.inputTextObj = null;
        }
    }

    _safeDestroy(key) {
        if (!this.storySprites[key]) return;
        if (typeof this.storySprites[key].destroy === 'function') {
            this.storySprites[key].destroy();
        }
        this.storySprites[key] = null;
    }
};
