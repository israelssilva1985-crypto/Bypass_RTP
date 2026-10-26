require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const https = require('https');

// ==========================================
// 🛡️ TRATAMENTO GLOBAL DE ERROS (Evita Crashes)
// ==========================================
process.on('uncaughtException', (err) => {
    console.error('💥 Erro não capturado capturado pelo sistema:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Promessa rejeitada não tratada:', reason);
});

// ==========================================
// 1. CARREGANDO VARIÁVEIS DO .ENV
// ==========================================
const token = process.env.TELEGRAM_TOKEN;
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;

const groupIds1 = process.env.GROUP_IDS_1 ? process.env.GROUP_IDS_1.split(',').map(id => id.trim()) : [];
const groupIds2 = process.env.GROUP_IDS_2 ? process.env.GROUP_IDS_2.split(',').map(id => id.trim()) : [];

if (!token) {
    console.error("❌ ERRO: TELEGRAM_TOKEN não configurado no arquivo .env");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', (error) => {
    console.log(`⚠️ Erro de conexão com o Telegram (Ignorado): ${error.code || error.message}`);
});

let botRodando = false;
let timeoutId = null;
let timeoutsFechamento = [];

// ==========================================
// 🗄️ BANCO DE DADOS (Grupos com Links Dedicados)
// ==========================================
const database = {
    grupos: [
        {
            nome: "Grupo de Links 1",
            ids: groupIds1,
            plataformas: [
                { nome: "98A.COM", link: "https://98a5.xyz/?pid=1425253988" },
                { nome: "78F_Slots", link: "http://wdbz8e.com/?pid=3946842948" },
                { nome: "838X_Slots", link: "https://838x1.com/?pid=4138194760" },
                { nome: "76P.COM", link: "https://76p11.com/?a=9pwvvbwm" },
                { nome: "30WIN", link: "https://30win104.com/?id=846395032" },
                { nome: "G45.COM", link: "https://G45004.com/?pid=4258938277" },
                { nome: "9BM.COM", link: "https://9bm.cloud/?pid=1411406752" },
                { nome: "234VIP", link: "https://234vip37.com/?pid=645762014" },
                { nome: "78Z.COM", link: "https://ydrgl3.com/?pid=3468467757" },
                { nome: "67Q_SLOTS", link: "https://rt9p87.com/?pid=2540232740" },
                { nome: "5KKK_SLOTS", link: "https://5kkk07.com/?pid=6600386280" },
                { nome: "79P.COM", link: "https://79p003.com/?pid=6366853274" },
                { nome: "FF345.NET", link: "https://ff345.org/?pid=1438668279" },
                { nome: "75C.COM", link: "https://75cc12.com/?pid=3881404916" }
            ]
        },
        {
            nome: "Grupo de Links 2",
            ids: groupIds2,
            plataformas: [
                { nome: "98A.COM", link: "https://98a9u.com/?pid=1517154055" },
                { nome: "78F_Slots", link: "https://mqu5dl.com/?pid=3977081005" },
                { nome: "838X_Slots", link: "https://838x5.com/?pid=4694100825" },
                { nome: "76P.COM", link: "https://76p11.com/?a=kvt4l6f0" },
                { nome: "30WIN", link: "https://d267gm0v6z4wns.cloudfront.net/?id=411979416" },
                { nome: "G45.COM", link: "https://G45001.com/?pid=4823233277" },
                { nome: "9BM.COM", link: "https://9bm.cloud/?pid=1671826683" },
                { nome: "234VIP", link: "https://234vip37.com/?pid=645762014" },
                { nome: "78Z.COM", link: "https://yrdeo3.com/?pid=3312022833" },
                { nome: "67Q_SLOTS", link: "https://y80ak8.com/?pid=2087704872" }
            ]
        }
    ],
    jogos: [
        { nome: "Fortune Tiger", provedor: "PG Slots", slotAposta: "slot1", podeTerBonus: false },
        { nome: "Fortune Ox", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Fortune Mouse", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Fortune Rabbit", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Double Fortune", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: false },
        { nome: "Ganesha Gold", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: false },
        { nome: "Fortune Snake", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: true },
        { nome: "Fortune Horse", provedor: "PG Slots", slotAposta: "slot5", podeTerBonus: true },
        { nome: "Gates of Olympus", provedor: "Pragmatic Play", slotAposta: "slot6", podeTerBonus: true },
        { nome: "Sweet Bonanza", provedor: "Pragmatic Play", slotAposta: "slot6", podeTerBonus: true },
        { nome: "Fortune Dragon", provedor: "PG Slots", slotAposta: "slot1", podeTerBonus: true }
    ]
};

// ==========================================
// 🎲 FUNÇÕES GERADORAS
// ==========================================
function pegarAleatorio(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function gerarSinal(listaPlataformas) {
    const plataforma = pegarAleatorio(listaPlataformas);
    const jogo = pegarAleatorio(database.jogos);
    
    const rtp = (Math.random() * (99.99 - 93.00) + 93.00).toFixed(2);
    
    const tipoJogada = Math.floor(Math.random() * 3);
    let jogadasTexto = "";
    const qtdNormal = Math.floor(Math.random() * 10) + 3; 
    const qtdTurbo = Math.floor(Math.random() * 10) + 3;  

    if (tipoJogada === 0) {
        jogadasTexto = `👉 ${qtdNormal}x Normal`;
    } else if (tipoJogada === 1) {
        jogadasTexto = `⚡ ${qtdTurbo}x Turbo`;
    } else {
        jogadasTexto = `👉 ${qtdNormal}x Normal\n⚡ ${qtdTurbo}x Turbo`;
    }

    let textoBonus = "";
    if (jogo.podeTerBonus && Math.random() < 0.1) {
        textoBonus = `\n🎁 <b>Bônus BET Ativado</b>`;
    }

    const esquemasAposta = {
        slot1: ["0,80", "1,20", "1,80", "2,20"],
        slot2: ["1,00", "1,50", "2,00", "2,50"],
        slot3: ["0,60", "0,90", "1,20", "1,50", "1,80"],
        slot4: ["0,40", "0,60", "1,00", "1,60"],
        slot5: ["0,75", "1,50", "2,25", "3,00"],
        slot6: ["1,20", "1,80", "2,40", "3,00"]
    };
    
    const arrayApostas = esquemasAposta[jogo.slotAposta] || esquemasAposta.slot1;
    const valorAposta = pegarAleatorio(arrayApostas);

    const agora = new Date();
    const validadeMinutos = Math.floor(Math.random() * 6) + 8; 
    const validadeTime = new Date(agora.getTime() + validadeMinutos * 60000);
    const validadeFormatada = validadeTime.toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });

    // Uso seguro de tags HTML para evitar travamento com caracteres especiais
    const textoAberto = `🟢 <b>SINAL CONFIRMADO</b> 🟢

🏢 <b>Plataforma:</b> <a href="${plataforma.link}">${plataforma.nome}</a>
🎮 <b>Jogo:</b> ${jogo.nome} (${jogo.provedor})
🔥 <b>RTP Atualizado:</b> ${rtp}%
💰 <b>Aposta Recomendada:</b> R$ ${valorAposta}

⚙️ <b>INSTRUÇÕES DE ENTRADA:</b>
${jogadasTexto}${textoBonus}
<i>Intercale caso não bata de primeira.</i>

⏳ <b>Válido até:</b> ${validadeFormatada}

🔗 <b><a href="${plataforma.link}">CLIQUE AQUI PARA JOGAR NA ${plataforma.nome.toUpperCase()}</a></b>`;

    const textoFechado = `🔴 <b>SINAL FINALIZADO</b> 🔴

🏢 <b>Plataforma:</b> <a href="${plataforma.link}">${plataforma.nome}</a>
🎮 <b>Jogo:</b> ${jogo.nome} (${jogo.provedor})
🔥 <b>RTP Atualizado:</b> ${rtp}%
💰 <b>Aposta Recomendada:</b> R$ ${valorAposta}

⚙️ <b>INSTRUÇÕES DE ENTRADA:</b>
${jogadasTexto}${textoBonus}

⏳ <b>Válido até:</b> ❌ SINAL ENCERRADO

🔗 <b><a href="${plataforma.link}">CLIQUE AQUI PARA JOGAR NA ${plataforma.nome.toUpperCase()}</a></b>`;

    return {
        textoAberto,
        textoFechado,
        tempoParaFecharMs: validadeMinutos * 60 * 1000
    };
}

// ==========================================
// 📡 DISPARO SEGREGADO POR GRUPO
// ==========================================
async function dispararSinais() {
    for (const grupoConfig of database.grupos) {
        if (!grupoConfig.ids || grupoConfig.ids.length === 0) continue;

        const sinal = gerarSinal(grupoConfig.plataformas);

        for (const chatId of grupoConfig.ids) {
            try {
                const msgEnviada = await bot.sendMessage(chatId, sinal.textoAberto, { 
                    parse_mode: 'HTML',
                    disable_web_page_preview: true 
                });
                console.log(`✅ Sinal (${grupoConfig.nome}) enviado para: ${chatId}`);

                // Sistema de fechamento com limpeza automática de memória
                let timer = null;
                timer = setTimeout(async () => {
                    try {
                        await bot.editMessageText(sinal.textoFechado, {
                            chat_id: chatId,
                            message_id: msgEnviada.message_id,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        });
                    } catch (err) {
                        console.error(`❌ Erro ao editar mensagem no ${chatId}:`, err.message);
                    } finally {
                        // Remove o timer finalizado da lista para não vazar memória
                        timeoutsFechamento = timeoutsFechamento.filter(t => t !== timer);
                    }
                }, sinal.tempoParaFecharMs);

                timeoutsFechamento.push(timer);

            } catch (error) {
                console.error(`❌ Erro ao enviar para ${chatId}:`, error.message);
            }
        }
    }
}

// ==========================================
// ⏰ LÓGICA DE TEMPOS QUEBRADOS
// ==========================================
function agendarProximoSinal() {
    if (!botRodando) return;

    const minTempo = 15 * 60 * 1000;
    const maxTempo = 25 * 60 * 1000;
    const tempoEspera = Math.floor(Math.random() * (maxTempo - minTempo + 1)) + minTempo;

    const tempoMinutos = (tempoEspera / 60000).toFixed(2);
    console.log(`⏳ Próximo sinal agendado para daqui a ${tempoMinutos} minutos.`);

    timeoutId = setTimeout(async () => {
        try {
            await dispararSinais();
        } catch (err) {
            console.error("❌ Erro ao disparar ciclo de sinais:", err.message);
        } finally {
            // Garante que o agendador continue ativo mesmo se houver erro no envio
            if (botRodando) agendarProximoSinal();
        }
    }, tempoEspera);
}

// ==========================================
// 🔐 SISTEMA DE AUTENTICAÇÃO E START/STOP
// ==========================================
bot.onText(/\/start_bot (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userDigitado = match[1];
    const passDigitada = match[2];

    if (userDigitado === adminUser && passDigitada === adminPass) {
        if (botRodando) {
            bot.sendMessage(chatId, "⚠️ O bot já está rodando!");
            return;
        }

        botRodando = true;
        bot.sendMessage(chatId, "✅ <b>Acesso Liberado!</b> Iniciando disparos por grupos...", { parse_mode: 'HTML' });

        try {
            await dispararSinais();
        } catch (err) {
            console.error("❌ Erro no disparo manual inicial:", err.message);
        } finally {
            agendarProximoSinal();
        }

    } else {
        bot.sendMessage(chatId, "❌ <b>Usuário ou senha incorretos.</b> Acesso negado.", { parse_mode: 'HTML' });
    }
});

bot.onText(/\/stop_bot (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userDigitado = match[1];
    const passDigitada = match[2];

    if (userDigitado === adminUser && passDigitada === adminPass) {
        botRodando = false;
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutsFechamento.forEach(timer => clearTimeout(timer));
        timeoutsFechamento = [];

        bot.sendMessage(chatId, "🛑 <b>Bot PARADO.</b>", { parse_mode: 'HTML' });
    } else {
        bot.sendMessage(chatId, "❌ <b>Usuário ou senha incorretos.</b> Acesso negado.", { parse_mode: 'HTML' });
    }
});

// ==========================================
// 🚀 INÍCIO AUTOMÁTICO (Piloto Automático 24/7)
// ==========================================
const totalGruposConfigurados = database.grupos.reduce((acc, g) => acc + g.ids.length, 0);

if (totalGruposConfigurados > 0) {
    botRodando = true;
    console.log("🤖 Sistema iniciado/reiniciado! Retomando disparos automáticos...");
    (async () => {
        try {
            await dispararSinais();
        } catch (err) {
            console.error("❌ Erro no disparo do ciclo de inicialização:", err.message);
        } finally {
            agendarProximoSinal();
        }
    })();
} else {
    console.error("❌ ERRO: Nenhum ID de grupo configurado nas variáveis de ambiente.");
}

// ==========================================
// 🌐 SERVIDOR WEB + AUTO-PING (Anti-Sleep Render)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Sinais operando 24/7!'));

app.listen(PORT, () => {
    console.log(`Servidor web escutando na porta ${PORT}`);
    
    setInterval(() => {
        const URL_DO_SEU_BOT = 'https://bypass-rtp.onrender.com'; 
        
        if (URL_DO_SEU_BOT.includes('onrender.com')) {
            https.get(URL_DO_SEU_BOT, (res) => {
                console.log(`⚡ Auto-ping enviado! Status: ${res.statusCode}`);
                res.resume(); // Consome os dados para liberar memória do processo
            }).on('error', (err) => {
                console.log(`⚠️ Erro no auto-ping: ${err.message}`);
            });
        }
    }, 5 * 60 * 1000);
});
