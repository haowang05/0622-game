/**
 * AudioManager — 集中管理 BGM 与 SFX
 * 素材目录：code/assets/sound/
 */
window.QW = window.QW || {};

QW.AudioManager = {
    SOUND_FILES: {
        click: 'sound/点击.mp3',
        door: 'sound/开门开抽屉声.mp3',
        water: 'sound/浇水声.mp3',
        saw: 'sound/锯木头.mp3',
        sigh: 'sound/叹气1.mp3',
        bgmFront: 'sound/前bgm(1).MP3',
        bgmBack: 'sound/后bgm2(1).MP3'
    },

    _queued: false,
    _currentBgmKey: null,
    _suppressClickThisFrame: false,
    _bgmVolume: 0.32,
    _bgmFrontVolume: 0.62,
    _sfxVolume: 0.85,
    _clickVolume: 0.55,

    preload(scene) {
        if (this._queued) return;
        this._queued = true;
        const base = 'assets/';
        Object.entries(this.SOUND_FILES).forEach(([key, relPath]) => {
            const url = base + relPath;
            scene.load.audio(`audio:${key}`, url);
        });
    },

    _ensureLoaded(scene) {
        if (!scene || !scene.sound) return false;
        return true;
    },

    _play(scene, audioKey, config) {
        if (!scene || !this._ensureLoaded(scene)) return null;
        if (!scene.cache.audio.exists(`audio:${audioKey}`)) {
            console.warn('[AudioManager] Missing audio:', audioKey);
            return null;
        }
        return scene.sound.play(`audio:${audioKey}`, config || {});
    },

    playBgmFront(scene) {
        if (this._currentBgmKey === 'bgmFront') return;
        this.stopBgm(scene);
        const sound = this._play(scene, 'bgmFront', { loop: true, volume: this._bgmFrontVolume });
        if (sound) this._currentBgmKey = 'bgmFront';
    },

    playBgmBack(scene) {
        if (this._currentBgmKey === 'bgmBack') return;
        this.stopBgm(scene);
        const sound = this._play(scene, 'bgmBack', { loop: true, volume: this._bgmVolume });
        if (sound) this._currentBgmKey = 'bgmBack';
    },

    stopBgm(scene) {
        if (scene && scene.sound) {
            scene.sound.stopByKey(`audio:${this._currentBgmKey}`);
        }
        this._currentBgmKey = null;
    },

    /** 同帧若已触发其它 SFX，则跳过点击音 */
    playClick(scene) {
        if (this._suppressClickThisFrame) {
            this._suppressClickThisFrame = false;
            return;
        }
        this._play(scene, 'click', { volume: this._clickVolume });
    },

    playDoor(scene) {
        this._playSfxExclusive(scene, 'door');
    },

    playWatering(scene) {
        this._playSfxExclusive(scene, 'water');
    },

    playSaw(scene) {
        this._playSfxExclusive(scene, 'saw');
    },

    playSigh(scene) {
        this._playSfxExclusive(scene, 'sigh');
    },

    _playSfxExclusive(scene, audioKey) {
        this._suppressClickThisFrame = true;
        this._play(scene, audioKey, { volume: this._sfxVolume });
    },

    /** 根据场景 key 自动维护 BGM 段 */
    syncBgmForScene(scene) {
        if (!scene) return;
        const key = scene.scene.key;
        const backKeys = [
            'HouseExterior', 'Mailbox', 'LivingRoomA', 'LivingRoomB', 'LivingRoomC',
            'LivingRoomReturn', 'GardenEntry', 'GardenSky', 'PondApproach', 'PondFish',
            'Bedroom', 'Password', 'SofaRepair', 'Ending', 'Popup'
        ];
        if (backKeys.indexOf(key) !== -1) {
            this.playBgmBack(scene);
        } else if (key === 'MainMenu' || key === 'Intro' || key === 'Office' || key === 'Dialog') {
            this.playBgmFront(scene);
        }
    }
};
