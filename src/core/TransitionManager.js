/**
 * TransitionManager — 场景过渡管理器
 * 跨场景：黑色淡出 125ms + 淡入 125ms
 * 同场景 restart / 状态刷新：不黑屏 fade
 * MainMenu / Intro：子元素缓慢淡入
 */
window.QW = window.QW || {};

QW.TransitionManager = {

    FADE_DURATION: 125,
    SLOW_REVEAL_DURATION: 900,
    isTransitioning: false,

    goto(currentScene, targetSceneKey, data) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        currentScene.input.enabled = false;

        currentScene.cameras.main.fadeOut(this.FADE_DURATION, 0, 0, 0);
        currentScene.cameras.main.once('camerafadeoutcomplete', () => {
            QW.GameState.pushScene(currentScene.scene.key);
            const payload = Object.assign({}, data || {}, { fromSceneTransition: true });
            currentScene.scene.start(targetSceneKey, payload);
        });
    },

    gotoImmediate(currentScene, targetSceneKey, data) {
        QW.GameState.pushScene(currentScene.scene.key);
        currentScene.scene.start(targetSceneKey, data || {});
    },

    finishEnter(scene) {
        const data = scene.scene.settings.data || {};
        const sceneKey = scene.scene.key;

        if (QW.AudioManager) {
            QW.AudioManager.syncBgmForScene(scene);
        }

        if (sceneKey === 'MainMenu' || sceneKey === 'Intro') {
            this._slowReveal(scene);
            return;
        }

        if (data.fromSceneTransition) {
            // 消费一次性跨场景标记，避免 scene.restart() 误触发 fade
            data.fromSceneTransition = false;
            this.fadeIn(scene);
        } else {
            this._instantEnter(scene);
        }
    },

    fadeIn(newScene) {
        newScene.cameras.main.fadeIn(this.FADE_DURATION, 0, 0, 0);
        newScene.cameras.main.once('camerafadeincomplete', () => {
            this._unlock(newScene);
        });
        newScene.time.delayedCall(this.FADE_DURATION + 50, () => {
            this._unlock(newScene);
        });
    },

    _instantEnter(scene) {
        scene.cameras.main.resetFX();
        this._unlock(scene);
    },

    _slowReveal(scene) {
        scene.cameras.main.resetFX();
        const targets = scene.children.list.filter((child) => child && child.setAlpha);
        targets.forEach((child) => {
            if (child.alpha === undefined) return;
            const finalAlpha = child.alpha === 0 ? 1 : child.alpha;
            child.setAlpha(0);
            scene.tweens.add({
                targets: child,
                alpha: finalAlpha,
                duration: this.SLOW_REVEAL_DURATION,
                ease: 'Sine.easeIn'
            });
        });
        this._unlock(scene);
    },

    /** 供 Intro 单帧叠加时使用 */
    revealTargets(scene, targets, duration) {
        if (!targets || !targets.length) return;
        targets.forEach((child) => {
            if (!child || !child.setAlpha) return;
            child.setAlpha(0);
            scene.tweens.add({
                targets: child,
                alpha: 1,
                duration: duration || 700,
                ease: 'Sine.easeIn'
            });
        });
    },

    _unlock(scene) {
        this.isTransitioning = false;
        if (scene.input) scene.input.enabled = true;
    }
};
