// ?????????????????????????
class UndergroundRadioGame {
    constructor() {
        this.gameState = null;
        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.renderAll();
    }

    getDefaultState() {
        return {
            day: 1,
            status: {
                power: 100,
                noise: 0,
                rumor: 0,
                fatigue: 0,
                morale: 50
            },
            thresholds: {
                power: 20,
                noise: 70,
                rumor: 70,
                fatigue: 70,
                morale: 30
            },
            resources: {
                food: 20,
                battery: 10,
                parts: 5,
                medicine: 3
            },
            survivors: this.generateSurvivors(),
            equipment: JSON.parse(JSON.stringify(GameData.equipmentList)),
            districts: JSON.parse(JSON.stringify(GameData.districts)),
            schedule: {
                morning: null,
                afternoon: null,
                evening: null
            },
            selectedBroadcast: null,
            currentQuestion: null,
            answeredQuestions: [],
            rumors: [],
            settlementHistory: [],
            todayActions: {
                broadcastDone: false,
                qaDone: 0,
                repairDone: [],
                rumorSuppressDone: []
            },
            gameOver: false
        };
    }

    generateSurvivors() {
        const survivors = [];
        const count = 4 + Math.floor(Math.random() * 3);
        const shuffledNames = [...GameData.survivorNames].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count; i++) {
            survivors.push({
                id: 'survivor_' + i,
                name: shuffledNames[i],
                skill: GameData.survivorSkills[Math.floor(Math.random() * GameData.survivorSkills.length)],
                fatigue: Math.floor(Math.random() * 20),
                health: 80 + Math.floor(Math.random() * 20),
                task: null
            });
        }
        return survivors;
    }

    generateRumor() {
        const rumorTemplates = [
            { title: '水源污染谣言', desc: '有人说自来水厂被污染了，不能喝水。', severity: 15 },
            { title: '怪物出没传闻', desc: '传言夜间有怪物在街道游荡。', severity: 20 },
            { title: '食物短缺恐慌', desc: '据说储备物资只够维持一周了。', severity: 18 },
            { title: '政府阴谋论', desc: '有人说这一切都是政府的阴谋。', severity: 12 },
            { title: '传染病扩散', desc: '听说新的传染病正在蔓延。', severity: 22 },
            { title: '救援队骗局', desc: '传言救援队根本不存在。', severity: 15 },
            { title: '核泄漏消息', desc: '据说远处的核电站发生了泄漏。', severity: 25 },
            { title: '暴动计划', desc: '有人在策划抢夺物资的暴动。', severity: 20 }
        ];
        
        const template = rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)];
        return {
            id: 'rumor_' + Date.now() + '_' + Math.random(),
            ...template,
            dayStarted: this.gameState.day
        };
    }

    saveGame() {
        localStorage.setItem('undergroundRadioSave', JSON.stringify(this.gameState));
        this.showEvent('游戏已保存', '你的游戏进度已保存到本地存储。', []);
    }

    loadGame() {
        const saved = localStorage.getItem('undergroundRadioSave');
        if (saved) {
            try {
                this.gameState = JSON.parse(saved);
                this.showEvent('读取存档', '成功读取游戏存档！', []);
            } catch (e) {
                this.gameState = this.getDefaultState();
            }
        } else {
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
        }
    }

    resetGame() {
        if (confirm('确定要重新开始吗？所有进度将会丢失。')) {
            localStorage.removeItem('undergroundRadioSave');
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
            this.renderAll();
            this.showEvent('新游戏开始', '欢迎来到地下广播站！你的任务是维持广播运营，安抚民心，管理物资和幸存者。', []);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('endDayBtn').addEventListener('click', () => this.endDay());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveGame());
        document.getElementById('loadBtn').addEventListener('click', () => { this.loadGame(); this.renderAll(); });
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        document.getElementById('doBroadcastBtn').addEventListener('click', () => this.doBroadcast());
        document.getElementById('doRepairBtn').addEventListener('click', () => this.doRepair());
        document.getElementById('suppressRumorBtn').addEventListener('click', () => this.suppressRumor());

        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            slider.addEventListener('input', (e) => {
                this.gameState.thresholds[stat] = parseInt(e.target.value);
                valSpan.textContent = e.target.value;
                this.renderStatus();
            });
        });

        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'qa' && !this.gameState.currentQuestion) {
            this.generateQuestion();
        }
    }

    renderAll() {
        this.renderStatus();
        this.renderResources();
        this.renderSurvivors();
        this.renderDistrictTrust();
        this.renderSchedule();
        this.renderBroadcasts();
        this.renderEquipment();
        this.renderRumors();
        this.renderSettlements();
        this.renderThresholds();
    }

    renderStatus() {
        const { status, thresholds } = this.gameState;
        
        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const value = Math.max(0, Math.min(100, status[stat]));
            const fill = document.getElementById(stat + 'Fill');
            const val = document.getElementById(stat + 'Value');
            const thresholdDisplay = document.getElementById(stat + 'Threshold');
            
            fill.style.width = value + '%';
            val.textContent = Math.round(value);
            
            const isWarning = (stat === 'power' || stat === 'morale') 
                ? value <= thresholds[stat] 
                : value >= thresholds[stat];
            
            fill.classList.toggle('warning', isWarning);
            thresholdDisplay.textContent = thresholds[stat];
            
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            if (slider) slider.value = thresholds[stat];
            if (valSpan) valSpan.textContent = thresholds[stat];
        });

        document.getElementById('dayCount').textContent = this.gameState.day;
    }

    renderThresholds() {
        Object.keys(this.gameState.thresholds).forEach(stat => {
            document.getElementById(stat + 'Threshold').textContent = this.gameState.thresholds[stat];
        });
    }

    renderResources() {
        const { resources } = this.gameState;
        document.getElementById('foodCount').textContent = resources.food;
        document.getElementById('batteryCount').textContent = resources.battery;
        document.getElementById('partsCount').textContent = resources.parts;
        document.getElementById('medicineCount').textContent = resources.medicine;
    }

    renderSurvivors() {
        const container = document.getElementById('survivorList');
        const repairSelect = document.getElementById('repairSurvivor');
        
        container.innerHTML = '';
        repairSelect.innerHTML = '';

        this.gameState.survivors.forEach(survivor => {
            const card = document.createElement('div');
            card.className = 'survivor-card';
            if (survivor.fatigue >= 70) card.classList.add('exhausted');
            else if (survivor.fatigue >= 40) card.classList.add('tired');

            card.innerHTML = `
                <div class="survivor-name">${survivor.name} <small style="color:#888">[${survivor.skill}]</small></div>
                <div class="survivor-stats">
                    <span>❤️ ${survivor.health}%</span>
                    <span>😴 ${survivor.fatigue}%</span>
                </div>
                ${survivor.task ? `<div class="survivor-task">${survivor.task}</div>` : ''}
            `;
            container.appendChild(card);

            if (!survivor.task) {
                const option = document.createElement('option');
                option.value = survivor.id;
                option.textContent = `${survivor.name} (${survivor.skill})`;
                repairSelect.appendChild(option);
            }
        });
    }

    renderDistrictTrust() {
        const container = document.getElementById('districtTrust');
        container.innerHTML = '';

        this.gameState.districts.forEach(district => {
            const item = document.createElement('div');
            item.className = 'district-item';
            item.innerHTML = `
                <div class="district-name">
                    <span>${district.name}</span>
                    <span style="color:#3498db">${district.trust}%</span>
                </div>
                <div class="district-bar">
                    <div class="district-bar-fill" style="width:${district.trust}%"></div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderSchedule() {
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const optionsContainer = document.getElementById(slot + 'Options');
            const slotDisplay = document.getElementById('slot' + slot.charAt(0).toUpperCase() + slot.slice(1));
            
            optionsContainer.innerHTML = '';
            
            GameData.programTypes.forEach(program => {
                const btn = document.createElement('button');
                btn.className = 'program-btn';
                if (this.gameState.schedule[slot] === program.id) {
                    btn.classList.add('selected');
                }
                
                const effectsText = Object.entries(program.effects)
                    .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
                    .join(', ');
                
                btn.innerHTML = `
                    <div>${program.name}</div>
                    <div class="program-effects">${effectsText} | ⚡${program.power}</div>
                `;
                
                btn.addEventListener('click', () => this.selectProgram(slot, program.id));
                optionsContainer.appendChild(btn);
            });

            const current = this.gameState.schedule[slot];
            if (current) {
                const program = GameData.programTypes.find(p => p.id === current);
                slotDisplay.textContent = program ? program.name : '未安排';
            } else {
                slotDisplay.textContent = '未安排';
            }
        });
    }

    renderBroadcasts() {
        const container = document.getElementById('broadcastList');
        container.innerHTML = '';

        GameData.broadcastMessages.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'broadcast-item';
            if (this.gameState.selectedBroadcast === msg.id) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <div class="broadcast-title">${msg.title}</div>
                <div class="broadcast-desc">${msg.content}</div>
            `;
            
            item.addEventListener('click', () => this.selectBroadcast(msg.id));
            container.appendChild(item);
        });

        document.getElementById('doBroadcastBtn').disabled = 
            !this.gameState.selectedBroadcast || this.gameState.todayActions.broadcastDone;
    }

    renderEquipment() {
        const container = document.getElementById('equipmentList');
        const select = document.getElementById('repairEquipment');
        
        container.innerHTML = '';
        select.innerHTML = '';

        this.gameState.equipment.forEach(eq => {
            const item = document.createElement('div');
            item.className = 'equipment-item';
            
            let conditionClass = 'condition-good';
            if (eq.condition <= 30) conditionClass = 'condition-bad';
            else if (eq.condition <= 60) conditionClass = 'condition-warn';

            let barColor = '#2ecc71';
            if (eq.condition <= 30) barColor = '#e74c3c';
            else if (eq.condition <= 60) barColor = '#f39c12';

            item.innerHTML = `
                <div class="equipment-header">
                    <span class="equipment-name">${eq.name}</span>
                    <span class="equipment-condition ${conditionClass}">${eq.condition}%</span>
                </div>
                <div class="equipment-bar">
                    <div class="equipment-bar-fill" style="width:${eq.condition}%; background:${barColor}"></div>
                </div>
                <div style="font-size:11px; color:#888; margin-top:5px">
                    影响: ${eq.effect} | 维修: 🔧${eq.repairCost}零件 | 修复: +${25}%
                </div>
            `;
            container.appendChild(item);

            if (eq.condition < 100 && !this.gameState.todayActions.repairDone.includes(eq.id)) {
                const option = document.createElement('option');
                option.value = eq.id;
                option.textContent = `${eq.name} (${eq.condition}%)`;
                select.appendChild(option);
            }
        });
    }

    renderRumors() {
        const container = document.getElementById('rumorList');
        const select = document.getElementById('rumorToSuppress');
        
        container.innerHTML = '';
        select.innerHTML = '';

        if (this.gameState.rumors.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:20px">暂无活跃谣言</p>';
            return;
        }

        this.gameState.rumors.forEach(rumor => {
            const item = document.createElement('div');
            item.className = 'rumor-item';
            item.innerHTML = `
                <div class="rumor-title">${rumor.title}</div>
                <div class="rumor-desc">${rumor.desc}</div>
                <div class="rumor-severity">
                    <span>严重程度</span>
                    <div class="rumor-severity-bar">
                        <div class="rumor-severity-fill" style="width:${rumor.severity}%"></div>
                    </div>
                    <span>${rumor.severity}%</span>
                </div>
            `;
            container.appendChild(item);

            if (!this.gameState.todayActions.rumorSuppressDone.includes(rumor.id)) {
                const option = document.createElement('option');
                option.value = rumor.id;
                option.textContent = `${rumor.title} (${rumor.severity}%)`;
                select.appendChild(option);
            }
        });

        document.getElementById('suppressRumorBtn').disabled = select.options.length === 0;
    }

    renderSettlements() {
        const container = document.getElementById('settlementList');
        container.innerHTML = '';

        if (this.gameState.settlementHistory.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:40px">暂无结算记录</p>';
            return;
        }

        this.gameState.settlementHistory.slice().reverse().forEach((settlement, index) => {
            const item = document.createElement('div');
            item.className = 'settlement-item clickable';
            item.title = '点击查看详细因果报告';
            
            let statsHtml = '';
            Object.entries(settlement.effects).forEach(([stat, value]) => {
                if (value !== 0) {
                    const className = value > 0 ? 'positive' : 'negative';
                    const sign = value > 0 ? '+' : '';
                    statsHtml += `<div class="settlement-stat ${className}"><span>${this.getStatName(stat)}</span><span>${sign}${value}</span></div>`;
                }
            });

            let keyDecisionPreview = '';
            if (settlement.keyDecisions && settlement.keyDecisions.length > 0) {
                const topDecision = settlement.keyDecisions[0];
                keyDecisionPreview = `<div class="settlement-decision-preview">💡 ${topDecision.length > 40 ? topDecision.substring(0, 40) + '...' : topDecision}</div>`;
            }

            item.innerHTML = `
                <div class="settlement-header">
                    <span>第 ${settlement.day} 天结算</span>
                    <span class="settlement-summary ${settlement.summary}">${settlement.summary}</span>
                </div>
                <div class="settlement-stats">${statsHtml}</div>
                ${keyDecisionPreview}
                <div class="settlement-hint">👆 点击查看详细因果报告</div>
            `;

            item.addEventListener('click', () => {
                this.showSettlementDetailModal(settlement);
            });

            container.appendChild(item);
        });
    }

    renderQuestion() {
        const question = this.gameState.currentQuestion;
        const questionText = document.getElementById('questionText');
        const optionsContainer = document.getElementById('answerOptions');
        const historyContainer = document.getElementById('historyList');

        if (!question) {
            questionText.textContent = '今日问答次数已用完，请明日再来。';
            optionsContainer.innerHTML = '';
        } else {
            questionText.textContent = question.question;
            optionsContainer.innerHTML = '';

            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option.text;
                btn.addEventListener('click', () => this.answerQuestion(index));
                optionsContainer.appendChild(btn);
            });
        }

        historyContainer.innerHTML = '';
        this.gameState.answeredQuestions.slice().reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item ' + (item.correct ? 'correct' : 'wrong');
            div.innerHTML = `<strong>${item.question}</strong><br><small>${item.correct ? '✓ 回答正确' : '✗ 回答错误'}: ${item.answer}</small>`;
            historyContainer.appendChild(div);
        });
    }

    getStatName(stat) {
        const names = {
            power: '⚡电量',
            noise: '🔊噪声',
            rumor: '🗣️谣言',
            fatigue: '😴疲劳',
            morale: '❤️民心',
            trust: '🤝信任',
            food: '🍞食物',
            battery: '🔋电池',
            parts: '🔧零件'
        };
        return names[stat] || stat;
    }

    selectProgram(slot, programId) {
        this.gameState.schedule[slot] = programId;
        this.renderSchedule();
    }

    selectBroadcast(broadcastId) {
        this.gameState.selectedBroadcast = broadcastId;
        
        const msg = GameData.broadcastMessages.find(m => m.id === broadcastId);
        const preview = document.getElementById('broadcastPreview');
        
        const effectsText = Object.entries(msg.effects)
            .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
            .join(' | ');
        
        preview.innerHTML = `
            <h4 style="color:#e94560; margin-bottom:10px">${msg.title}</h4>
            <p>${msg.content}</p>
            <p style="color:#888; font-size:12px; margin-top:10px">效果: ${effectsText} | 耗电: ⚡${msg.power}</p>
        `;
        
        this.renderBroadcasts();
    }

    doBroadcast() {
        const msg = GameData.broadcastMessages.find(m => m.id === this.gameState.selectedBroadcast);
        if (!msg || this.gameState.todayActions.broadcastDone) return;

        if (this.gameState.status.power < msg.power) {
            this.showEvent('电力不足', '电量不足，无法进行播报！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.applyEffects(msg.effects);
        this.gameState.status.power -= msg.power;
        this.gameState.todayActions.broadcastDone = true;

        const effectTags = Object.entries(msg.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        this.showEvent('播报完成', `已播报：${msg.title}`, effectTags);
        this.renderAll();
    }

    generateQuestion() {
        if (this.gameState.todayActions.qaDone >= 3) {
            this.gameState.currentQuestion = null;
        } else {
            const available = GameData.questionBank.filter(q => 
                !this.gameState.answeredQuestions.some(a => a.question === q.question)
            );
            
            if (available.length > 0) {
                this.gameState.currentQuestion = available[Math.floor(Math.random() * available.length)];
            } else {
                this.gameState.currentQuestion = GameData.questionBank[Math.floor(Math.random() * GameData.questionBank.length)];
            }
        }
        this.renderQuestion();
    }

    answerQuestion(optionIndex) {
        const question = this.gameState.currentQuestion;
        if (!question) return;

        const option = question.options[optionIndex];
        this.applyEffects(option.effects);
        this.gameState.todayActions.qaDone++;

        this.gameState.answeredQuestions.push({
            question: question.question,
            answer: option.text,
            correct: option.correct,
            day: this.gameState.day
        });

        const effectTags = Object.entries(option.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        const title = option.correct ? '回答正确！' : '回答不佳...';
        this.showEvent(title, option.text, effectTags);

        this.generateQuestion();
        this.renderStatus();
    }

    doRepair() {
        const eqId = document.getElementById('repairEquipment').value;
        const survivorId = document.getElementById('repairSurvivor').value;
        
        if (!eqId || !survivorId) return;

        const equipment = this.gameState.equipment.find(e => e.id === eqId);
        const survivor = this.gameState.survivors.find(s => s.id === survivorId);
        
        if (!equipment || !survivor) return;

        if (this.gameState.resources.parts < equipment.repairCost) {
            this.showEvent('零件不足', '没有足够的零件进行维修！', [{ text: '🔧零件不足', type: 'negative' }]);
            return;
        }

        this.gameState.resources.parts -= equipment.repairCost;
        
        const repairBonus = survivor.skill === '维修' ? 15 : 0;
        const repairAmount = 25 + repairBonus;
        equipment.condition = Math.min(100, equipment.condition + repairAmount);
        
        survivor.fatigue += 20;
        survivor.task = `维修 ${equipment.name}`;
        
        this.gameState.todayActions.repairDone.push(eqId);

        this.showEvent('维修完成', `${survivor.name} 完成了 ${equipment.name} 的维修工作！`, [
            { text: `🔧 ${equipment.name} +${repairAmount}%`, type: 'positive' },
            { text: `😴 ${survivor.name} 疲劳 +20`, type: 'negative' }
        ]);

        this.renderAll();
    }

    suppressRumor() {
        const rumorId = document.getElementById('rumorToSuppress').value;
        if (!rumorId) return;

        const rumor = this.gameState.rumors.find(r => r.id === rumorId);
        if (!rumor) return;

        if (this.gameState.status.power < 8) {
            this.showEvent('电力不足', '电量不足，无法发布澄清广播！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.gameState.status.power -= 8;
        rumor.severity -= 40;
        this.gameState.status.rumor -= 15;
        this.gameState.status.fatigue += 10;
        this.gameState.todayActions.rumorSuppressDone.push(rumorId);

        let effectTags = [
            { text: `🗣️ 谣言 -40%`, type: 'positive' },
            { text: `😴 疲劳 +10`, type: 'negative' }
        ];

        if (rumor.severity <= 0) {
            this.gameState.rumors = this.gameState.rumors.filter(r => r.id !== rumorId);
            this.gameState.status.morale += 10;
            effectTags.push({ text: '✅ 谣言已平息', type: 'positive' });
            effectTags.push({ text: '❤️ 民心 +10', type: 'positive' });
        }

        this.showEvent('发布澄清', `针对"${rumor.title}"发布了官方澄清消息。`, effectTags);
        this.renderAll();
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'trust') {
                this.gameState.districts.forEach(d => {
                    d.trust = Math.max(0, Math.min(100, d.trust + value));
                });
            } else if (this.gameState.status[key] !== undefined) {
                this.gameState.status[key] = Math.max(0, Math.min(100, this.gameState.status[key] + value));
            } else if (this.gameState.resources[key] !== undefined) {
                this.gameState.resources[key] = Math.max(0, this.gameState.resources[key] + value);
            }
        });
    }

    generateDailyRumors() {
        if (Math.random() < 0.6) {
            this.gameState.rumors.push(this.generateRumor());
        }
        if (this.gameState.day > 3 && Math.random() < 0.4) {
            this.gameState.rumors.push(this.generateRumor());
        }
    }

    endDay() {
        const causalReport = {
            programEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 },
            broadcastEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 },
            qaEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 },
            equipmentEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 },
            rumorEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 },
            resourceEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0, food: 0 },
            thresholdEffects: { power: 0, noise: 0, rumor: 0, fatigue: 0, morale: 0 }
        };

        const programDetails = [];
        let totalPowerUsed = 0;
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const programId = this.gameState.schedule[slot];
            if (programId) {
                const program = GameData.programTypes.find(p => p.id === programId);
                if (program) {
                    totalPowerUsed += program.power;
                    const slotName = { morning: '早间', afternoon: '午间', evening: '晚间' }[slot];
                    const effectsText = Object.entries(program.effects)
                        .filter(([_, v]) => v !== 0)
                        .map(([k, v]) => `${this.getStatName(k)}${v > 0 ? '+' : ''}${v}`)
                        .join(', ');
                    programDetails.push(`${slotName}：${program.name}（${effectsText}，耗电⚡${program.power}）`);
                    Object.entries(program.effects).forEach(([k, v]) => {
                        if (causalReport.programEffects[k] !== undefined) {
                            causalReport.programEffects[k] += v;
                        }
                    });
                }
            }
        });
        causalReport.programEffects.power -= totalPowerUsed;

        const broadcastDetails = [];
        if (this.gameState.todayActions.broadcastDone && this.gameState.selectedBroadcast) {
            const msg = GameData.broadcastMessages.find(m => m.id === this.gameState.selectedBroadcast);
            if (msg) {
                const effectsText = Object.entries(msg.effects)
                    .filter(([_, v]) => v !== 0)
                    .map(([k, v]) => `${this.getStatName(k)}${v > 0 ? '+' : ''}${v}`)
                    .join(', ');
                broadcastDetails.push(`播报：${msg.title}（${effectsText}，耗电⚡${msg.power}）`);
                Object.entries(msg.effects).forEach(([k, v]) => {
                    if (causalReport.broadcastEffects[k] !== undefined) {
                        causalReport.broadcastEffects[k] += v;
                    }
                });
                causalReport.broadcastEffects.power -= msg.power;
            }
        }

        const qaDetails = [];
        const todayQa = this.gameState.answeredQuestions.filter(q => q.day === this.gameState.day);
        let qaCorrect = 0, qaWrong = 0;
        todayQa.forEach(item => {
            const question = GameData.questionBank.find(q => q.question === item.question);
            if (question) {
                const option = question.options.find(o => o.text === item.answer);
                if (option) {
                    const effectsText = Object.entries(option.effects)
                        .filter(([_, v]) => v !== 0)
                        .map(([k, v]) => `${this.getStatName(k)}${v > 0 ? '+' : ''}${v}`)
                        .join(', ');
                    qaDetails.push(`${item.correct ? '✓' : '✗'} ${item.question.substring(0, 20)}... → ${effectsText}`);
                    Object.entries(option.effects).forEach(([k, v]) => {
                        if (causalReport.qaEffects[k] !== undefined) {
                            causalReport.qaEffects[k] += v;
                        }
                    });
                    if (item.correct) qaCorrect++; else qaWrong++;
                }
            }
        });

        const equipmentDetails = [];
        this.gameState.todayActions.repairDone.forEach(eqId => {
            const eq = this.gameState.equipment.find(e => e.id === eqId);
            if (eq) {
                const survivor = this.gameState.survivors.find(s => s.task && s.task.includes(eq.name));
                equipmentDetails.push(`维修 ${eq.name}（+25%状态，消耗🔧${eq.repairCost}零件${survivor ? `，${survivor.name}疲劳+20` : ''}）`);
            }
        });
        this.gameState.equipment.forEach(eq => {
            if (eq.condition <= 30) {
                causalReport.equipmentEffects.morale -= 3;
                equipmentDetails.push(`${eq.name} 状态过低（${eq.condition}%），民心-3`);
            }
        });

        const rumorDetails = [];
        this.gameState.todayActions.rumorSuppressDone.forEach(rumorId => {
            const rumor = this.gameState.rumors.find(r => r.id === rumorId) || 
                          this.gameState.settlementHistory.length > 0 ? null : null;
            if (rumor) {
                rumorDetails.push(`压制谣言"${rumor.title}"（严重度-40，民心+10，耗电⚡8，疲劳+10）`);
            } else {
                rumorDetails.push(`压制谣言成功（谣言已平息，民心+10，耗电⚡8，疲劳+10）`);
            }
        });
        let activeRumorCount = 0;
        let severeRumorCount = 0;
        this.gameState.rumors.forEach(rumor => {
            rumor.severity += 10;
            causalReport.rumorEffects.rumor += 5;
            activeRumorCount++;
            if (rumor.severity >= 80) {
                causalReport.rumorEffects.morale -= 8;
                severeRumorCount++;
            }
        });
        if (activeRumorCount > 0) {
            rumorDetails.push(`${activeRumorCount}个活跃谣言自然发酵，谣言+${activeRumorCount * 5}`);
        }
        if (severeRumorCount > 0) {
            rumorDetails.push(`${severeRumorCount}个严重谣言（≥80%）导致民心-${severeRumorCount * 8}`);
        }
        this.gameState.rumors = this.gameState.rumors.filter(r => r.severity <= 100);

        const resourceDetails = [];
        const survivorCount = this.gameState.survivors.length;
        causalReport.resourceEffects.food -= survivorCount;
        resourceDetails.push(`${survivorCount}名幸存者消耗食物-${survivorCount}`);
        this.gameState.resources.food += causalReport.resourceEffects.food;

        this.gameState.survivors.forEach(s => {
            if (s.fatigue > 0) {
                s.fatigue = Math.max(0, s.fatigue - 30);
            }
            if (s.task) {
                s.task = null;
            }
        });

        const thresholdDetails = [];
        if (this.gameState.status.power + causalReport.programEffects.power + causalReport.broadcastEffects.power <= this.gameState.thresholds.power) {
            causalReport.thresholdEffects.morale -= 10;
            thresholdDetails.push(`电量低于警戒线（${this.gameState.thresholds.power}%），民心-10`);
        }
        if (this.gameState.status.noise + causalReport.programEffects.noise >= this.gameState.thresholds.noise) {
            causalReport.thresholdEffects.morale -= 5;
            causalReport.thresholdEffects.fatigue += 10;
            thresholdDetails.push(`噪声高于警戒线（${this.gameState.thresholds.noise}%），民心-5，疲劳+10`);
        }
        if (this.gameState.status.rumor + causalReport.rumorEffects.rumor + causalReport.programEffects.rumor + causalReport.broadcastEffects.rumor + causalReport.qaEffects.rumor >= this.gameState.thresholds.rumor) {
            causalReport.thresholdEffects.morale -= 15;
            thresholdDetails.push(`谣言高于警戒线（${this.gameState.thresholds.rumor}%），民心-15`);
        }
        if (this.gameState.status.fatigue + causalReport.thresholdEffects.fatigue >= this.gameState.thresholds.fatigue) {
            causalReport.thresholdEffects.morale -= 5;
            thresholdDetails.push(`疲劳高于警戒线（${this.gameState.thresholds.fatigue}%），民心-5`);
        }

        const totalMoraleBefore = this.gameState.status.morale + 
            causalReport.programEffects.morale + 
            causalReport.broadcastEffects.morale + 
            causalReport.qaEffects.morale + 
            causalReport.equipmentEffects.morale + 
            causalReport.rumorEffects.morale + 
            causalReport.thresholdEffects.morale;

        if (totalMoraleBefore <= this.gameState.thresholds.morale) {
            this.gameState.districts.forEach(d => {
                d.trust = Math.max(0, d.trust - 5);
            });
            thresholdDetails.push(`民心低于警戒线（${this.gameState.thresholds.morale}%），各城区信任-5`);
        }

        if (this.gameState.resources.food < 0) {
            causalReport.resourceEffects.morale -= 20;
            this.gameState.resources.food = 0;
            this.gameState.survivors.forEach(s => {
                s.health -= 10;
            });
            resourceDetails.push(`食物短缺！民心-20，幸存者健康-10`);
        }

        const dayEffects = {
            power: causalReport.programEffects.power + causalReport.broadcastEffects.power,
            noise: causalReport.programEffects.noise,
            rumor: causalReport.programEffects.rumor + causalReport.rumorEffects.rumor + causalReport.broadcastEffects.rumor + causalReport.qaEffects.rumor,
            fatigue: causalReport.programEffects.fatigue + causalReport.thresholdEffects.fatigue,
            morale: causalReport.programEffects.morale + causalReport.broadcastEffects.morale + causalReport.qaEffects.morale + causalReport.equipmentEffects.morale + causalReport.rumorEffects.morale + causalReport.resourceEffects.morale + causalReport.thresholdEffects.morale,
            food: causalReport.resourceEffects.food
        };

        Object.entries(dayEffects).forEach(([k, v]) => {
            if (k !== 'food' && this.gameState.status[k] !== undefined) {
                this.gameState.status[k] = Math.max(0, Math.min(100, this.gameState.status[k] + v));
            }
        });

        let summary = '正常';
        if (this.gameState.status.morale <= 20) summary = '危急';
        else if (this.gameState.status.morale <= 40) summary = '堪忧';
        else if (this.gameState.status.morale >= 80) summary = '良好';

        const keyDecisions = [];
        if (programDetails.length > 0) keyDecisions.push(...programDetails.filter(d => d.includes('紧急') || d.includes('访谈') || d.includes('静默')));
        if (broadcastDetails.length > 0) keyDecisions.push(...broadcastDetails);
        if (equipmentDetails.length > 0 && equipmentDetails.some(d => d.includes('维修'))) keyDecisions.push(...equipmentDetails.filter(d => d.includes('维修')));
        if (rumorDetails.length > 0 && rumorDetails.some(d => d.includes('压制'))) keyDecisions.push(...rumorDetails.filter(d => d.includes('压制')));
        if (qaDetails.length > 0) keyDecisions.push(`今日问答：${qaCorrect}对${qaWrong}错`);
        if (keyDecisions.length === 0) keyDecisions.push('今日无重大决策');

        this.gameState.settlementHistory.push({
            day: this.gameState.day,
            effects: dayEffects,
            summary: summary,
            causalReport: causalReport,
            details: {
                programs: programDetails,
                broadcasts: broadcastDetails,
                qa: qaDetails,
                equipment: equipmentDetails,
                rumors: rumorDetails,
                resources: resourceDetails,
                thresholds: thresholdDetails
            },
            keyDecisions: keyDecisions,
            qaStats: { correct: qaCorrect, wrong: qaWrong },
            schedule: { ...this.gameState.schedule }
        });

        this.showSettlementModal(dayEffects, summary, causalReport, {
            programs: programDetails,
            broadcasts: broadcastDetails,
            qa: qaDetails,
            equipment: equipmentDetails,
            rumors: rumorDetails,
            resources: resourceDetails,
            thresholds: thresholdDetails
        }, keyDecisions);

        this.gameState.day++;
        this.gameState.schedule = { morning: null, afternoon: null, evening: null };
        this.gameState.selectedBroadcast = null;
        this.gameState.currentQuestion = null;
        this.gameState.todayActions = {
            broadcastDone: false,
            qaDone: 0,
            repairDone: [],
            rumorSuppressDone: []
        };

        this.generateDailyRumors();

        this.gameState.equipment.forEach(eq => {
            eq.condition = Math.max(0, eq.condition - 3);
        });

        if (Math.random() < 0.3) {
            this.gameState.resources.parts += Math.floor(Math.random() * 3) + 1;
        }
        if (Math.random() < 0.3) {
            this.gameState.resources.battery += Math.floor(Math.random() * 2) + 1;
        }
        if (Math.random() < 0.2) {
            this.gameState.resources.food += Math.floor(Math.random() * 5) + 2;
        }

        if (this.gameState.status.morale <= 0) {
            this.gameOver('民心崩溃', '广播站失去了所有听众的信任，人们不再相信你了...');
            return;
        }
        if (this.gameState.status.power <= 0 && this.gameState.resources.battery <= 0) {
            this.gameOver('电力耗尽', '所有电力来源都已耗尽，广播站陷入了黑暗...');
            return;
        }

        this.renderAll();
    }

    showSettlementModal(effects, summary, causalReport, details, keyDecisions) {
        const html = this.buildCausalReportHtml(this.gameState.day, effects, summary, causalReport, details, keyDecisions);
        document.getElementById('modalTitle').textContent = `第 ${this.gameState.day} 天因果报告 - ${summary}`;
        document.getElementById('modalText').innerHTML = html;
        document.getElementById('modalEffects').innerHTML = '';
        document.getElementById('eventModal').classList.add('active');
    }

    buildCausalReportHtml(day, effects, summary, causalReport, details, keyDecisions) {
        const formatEffects = (eff) => {
            return Object.entries(eff)
                .filter(([_, v]) => v !== 0)
                .map(([k, v]) => {
                    const className = v > 0 ? 'positive' : 'negative';
                    const sign = v > 0 ? '+' : '';
                    return `<span class="effect-tag ${className}">${this.getStatName(k)} ${sign}${v}</span>`;
                })
                .join('');
        };

        const sectionHtml = (title, icon, effects, detailList) => {
            const hasEffects = Object.values(effects).some(v => v !== 0);
            const hasDetails = detailList && detailList.length > 0;
            if (!hasEffects && !hasDetails) return '';
            return `
                <div class="causal-section">
                    <div class="causal-section-header">
                        <span class="causal-icon">${icon}</span>
                        <span class="causal-title">${title}</span>
                    </div>
                    ${hasEffects ? `<div class="causal-effects">${formatEffects(effects)}</div>` : ''}
                    ${hasDetails ? `
                        <ul class="causal-details">
                            ${detailList.map(d => `<li>${d}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;
        };

        let totalHtml = `<div class="causal-report">`;
        
        totalHtml += `<div class="causal-summary">
            <div class="causal-summary-title">📊 今日运营总结</div>
            <div class="causal-summary-effects">${formatEffects(effects)}</div>
        </div>`;

        totalHtml += sectionHtml('节目编排', '📅', causalReport.programEffects, details.programs);
        totalHtml += sectionHtml('广播消息', '📢', causalReport.broadcastEffects, details.broadcasts);
        totalHtml += sectionHtml('听众问答', '❓', causalReport.qaEffects, details.qa);
        totalHtml += sectionHtml('设备状态', '🔧', causalReport.equipmentEffects, details.equipment);
        totalHtml += sectionHtml('谣言动态', '🚫', causalReport.rumorEffects, details.rumors);
        totalHtml += sectionHtml('资源消耗', '📦', causalReport.resourceEffects, details.resources);
        totalHtml += sectionHtml('阈值警告', '⚠️', causalReport.thresholdEffects, details.thresholds);

        if (keyDecisions && keyDecisions.length > 0) {
            totalHtml += `
                <div class="causal-section">
                    <div class="causal-section-header">
                        <span class="causal-icon">🎯</span>
                        <span class="causal-title">今日关键决策</span>
                    </div>
                    <ul class="causal-details">
                        ${keyDecisions.map(d => `<li class="key-decision">${d}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        totalHtml += `</div>`;
        return totalHtml;
    }

    showSettlementDetailModal(settlement) {
        const html = this.buildCausalReportHtml(
            settlement.day,
            settlement.effects,
            settlement.summary,
            settlement.causalReport,
            settlement.details,
            settlement.keyDecisions
        );
        document.getElementById('modalTitle').textContent = `第 ${settlement.day} 天结算回顾 - ${settlement.summary}`;
        document.getElementById('modalText').innerHTML = html;
        document.getElementById('modalEffects').innerHTML = '';
        document.getElementById('eventModal').classList.add('active');
    }

    showEvent(title, text, effects) {
        let effectsHtml = '';
        effects.forEach(e => {
            effectsHtml += `<span class="effect-tag ${e.type}">${e.text}</span>`;
        });

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modalEffects').innerHTML = effectsHtml;
        document.getElementById('eventModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('eventModal').classList.remove('active');
    }

    gameOver(title, message) {
        this.gameState.gameOver = true;
        this.showEvent(`游戏结束 - ${title}`, message + `\n你坚持了 ${this.gameState.day} 天。`, []);
        document.getElementById('endDayBtn').disabled = true;
    }
}
