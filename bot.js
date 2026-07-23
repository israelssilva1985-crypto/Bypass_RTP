require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// 1. CARREGANDO VARIÁVEIS DO .ENV
const token = process.env.TELEGRAM_TOKEN;
const groupIds = process.env.GROUP_IDS ? process.env.GROUP_IDS.split(',').map(id => id.trim()) : [];
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;

if (!token) {
    console.error("❌ ERRO: TELEGRAM_TOKEN não configurado no arquivo .env");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Variáveis de controle do estado do Bot
let botRodando = false;
let timeoutId = null;
let timeoutsFechamento = [];

// ==========================================
// 🗄️ BANCO DE DADOS (Plataformas, Jogos, Slots e Bônus)
// ==========================================
const database = {
    plataformas: [
        { nome: "98A.COM", link: "https://98a5.xyz/?pid=1425253988" },
        { nome: "78F_Slots", link: "http://wdbz8e.com/?pid=3946842948" },
        { nome: "838X_Slots", link: "https://838x1.com/?pid=4138194760" },
        { nome: "76P.COM", link: "https://76p11.com/?a=9pwvvbwm" },
        { nome: "30WIN", link: "https://30win104.com/?id=846395032" },
        { nome: "119BET", link: "https://119bet1.com/?id=805137404" },
        { nome: "6GBET", link: "https://www.6gbet1.com/?id=965858595" },
        { nome: "146BET", link: "https://www.146bet.co/?id=605924844" },
        { nome: "G45.COM", link: "https://G45004.com/?pid=4258938277" },
        { nome: "385BET", link: "https://385bet44.com/?id=118782107" },
        { nome: "318BET", link: "https://www.318bet22.com/?id=816909463" },
        { nome: "9BM.COM", link: "https://9bm.cloud/?pid=1411406752" }
    ],
    jogos: [
        // PG Slots
        { nome: "Fortune Tiger", provedor: "PG Slots", slotAposta: "slot1", podeTerBonus: false },
        { nome: "Fortune Ox", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Fortune Mouse", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Fortune Rabbit", provedor: "PG Slots", slotAposta: "slot2", podeTerBonus: false },
        { nome: "Double Fortune", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: false },
        { nome: "Ganesha Gold", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: false },
        
        // Jogos com possibilidade de compra de Bônus (Exemplos que você pediu)
        { nome: "Fortune Snake", provedor: "PG Slots", slotAposta: "slot3", podeTerBonus: true },
        { nome: "Fortune Horse", provedor: "PG Slots", slotAposta: "slot5", podeTerBonus: true },
        
        // Pragmatic Play e Hacksaw
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

function gerarSinal() {
    const plataforma = pegarAleatorio(database.plataformas);
    const jogo = pegarAleatorio(database.jogos);
    
    // RTP Aleatório entre 93.00% e 99.99%
    const rtp = (Math.random() * (99.99 - 93.00) + 93.00).toFixed(2);
    
    // Sorteando as jogadas Normais/Turbo
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

    // Lógica Aleatória de Bônus (10% de chance de aparecer SE o jogo permitir)
    let textoBonus = "";
    if (jogo.podeTerBonus) {
        const ativarBonus = Math.random() < 0.1; // 10% de chance
        if (ativarBonus) {
            textoBonus = `\n🎁 **Bônus BET Ativado**`;
        }
    }

    // Lógica do valor da Aposta baseada em Slots
    const esquemasAposta = {
        slot1: ["0,80", "1,20", "1,80", "2,20"],
        slot2: ["1,00", "1,50", "2,00", "2,50"],
        slot3: ["0,60", "0,90", "1,20", "1,50", "1,80"],
        slot4: ["0,40", "0,60", "1,00", "1,60"],
        slot5: ["0,75", "1,50", "2,25", "3,00"],
        slot6: ["1,20", "1,80", "2,40", "3,00"]
    };
    
    // Pega o array de valores correspondente ao slot do jogo, caso não ache, usa o slot1 como padrão
    const arrayApostas = esquemasAposta[jogo.slotAposta] || esquemasAposta.slot1;
    const valorAposta = pegarAleatorio(arrayApostas);

    // Horário de validade (8 a 13 minutos)
    const agora = new Date();
    const validadeMinutos = Math.floor(Math.random() * 6) + 8; 
    const validadeTime = new Date(agora.getTime() + validadeMinutos * 60000);
    const validadeFormatada = validadeTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Mensagem Aberta
    const textoAberto = `🟢 **SINAL CONFIRMADO** 🟢

🏢 **Plataforma:** [${plataforma.nome}](${plataforma.link})
🎮 **Jogo:** ${jogo.nome} (${jogo.provedor})
🔥 **RTP Atualizado:** ${rtp}%
💰 **Aposta Recomendada:** R$ ${valorAposta}

⚙️ **INSTRUÇÕES DE ENTRADA:**
${jogadasTexto}${textoBonus}
*Intercale caso não bata de primeira.*

⏳ **Válido até:** ${validadeFormatada}

🔗 **[CLIQUE AQUI PARA JOGAR NA ${plataforma.nome.toUpperCase()}](${plataforma.link})**`;

    // Mensagem Fechada (Editada após o tempo)
    const textoFechado = `🔴 **SINAL FINALIZADO** 🔴

🏢 **Plataforma:** [${plataforma.nome}](${plataforma.link})
🎮 **Jogo:** ${jogo.nome} (${jogo.provedor})
🔥 **RTP Atualizado:** ${rtp}%
💰 **Aposta Recomendada:** R$ ${valorAposta}

⚙️ **INSTRUÇÕES DE ENTRADA:**
${jogadasTexto}${textoBonus}

⏳ **Válido até:** ❌ SINAL ENCERRADO

🔗 **[CLIQUE AQUI PARA JOGAR NA ${plataforma.nome.toUpperCase()}](${plataforma.link})**`;

    return {
        textoAberto: textoAberto,
        textoFechado: textoFechado,
        tempoParaFecharMs: validadeMinutos * 60 * 1000 // Convertendo para milissegundos
    };
}

// ==========================================
// ⏰ LÓGICA DE TEMPOS QUEBRADOS (15 a 25 min)
// ==========================================
function agendarProximoSinal() {
    if (!botRodando) return;

    // Calcula um tempo aleatório entre 15 e 25 minutos
    const minTempo = 15 * 60 * 1000;
    const maxTempo = 25 * 60 * 1000;
    const tempoEspera = Math.floor(Math.random() * (maxTempo - minTempo + 1)) + minTempo;

    const tempoMinutos = (tempoEspera / 60000).toFixed(2);
    console.log(`⏳ Próximo sinal agendado para daqui a ${tempoMinutos} minutos.`);

    timeoutId = setTimeout(async () => {
        const sinal = gerarSinal();
        
        for (const chatId of groupIds) {
            try {
                // Dispara o sinal
                const msgEnviada = await bot.sendMessage(chatId, sinal.textoAberto, { 
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true 
                });
                console.log(`✅ Sinal enviado para: ${chatId}`);

                // Agenda a EDIÇÃO da mensagem para fechá-la depois que a validade acabar
                const fechamento = setTimeout(() => {
                    bot.editMessageText(sinal.textoFechado, {
                        chat_id: chatId,
                        message_id: msgEnviada.message_id,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    }).catch(err => console.error(`❌ Erro ao editar mensagem no ${chatId}:`, err.message));
                }, sinal.tempoParaFecharMs);

                timeoutsFechamento.push(fechamento);

            } catch (error) {
                console.error(`❌ Erro ao enviar para ${chatId}:`, error.message);
            }
        }
        
        agendarProximoSinal();
        
    }, tempoEspera);
}

// ==========================================
// 🔐 SISTEMA DE AUTENTICAÇÃO E START/STOP
// ==========================================

bot.onText(/\/start_bot (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userDigitado = match[1];
    const passDigitada = match[2];

    if (userDigitado === adminUser && passDigitada === adminPass) {
        if (botRodando) {
            bot.sendMessage(chatId, "⚠️ O bot já está rodando!");
            return;
        }
        
        if (groupIds.length === 0) {
            bot.sendMessage(chatId, "❌ **Erro:** Nenhum ID de grupo configurado.");
            return;
        }

        botRodando = true;
        bot.sendMessage(chatId, "✅ **Acesso Liberado!** Iniciando disparos e edições...", { parse_mode: 'Markdown' });
        
        const sinal = gerarSinal();
        
        (async () => {
            for (const id of groupIds) {
                try {
                    const msgEnviada = await bot.sendMessage(id, sinal.textoAberto, { parse_mode: 'Markdown', disable_web_page_preview: true });
                    
                    const fechamento = setTimeout(() => {
                        bot.editMessageText(sinal.textoFechado, {
                            chat_id: id,
                            message_id: msgEnviada.message_id,
                            parse_mode: 'Markdown',
                            disable_web_page_preview: true
                        }).catch(err => console.error(`Erro ao fechar:`, err.message));
                    }, sinal.tempoParaFecharMs);

                    timeoutsFechamento.push(fechamento);

                } catch(err) {
                    console.error(`Falha no primeiro envio para ${id}:`, err.message);
                }
            }
            agendarProximoSinal();
        })();

    } else {
        bot.sendMessage(chatId, "❌ **Usuário ou senha incorretos.** Acesso negado.", { parse_mode: 'Markdown' });
    }
});

bot.onText(/\/stop_bot (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userDigitado = match[1];
    const passDigitada = match[2];

    if (userDigitado === adminUser && passDigitada === adminPass) {
        botRodando = false;
        
        // Cancela o próximo disparo
        if (timeoutId) clearTimeout(timeoutId);
        
        // Cancela todos os fechamentos de sinais pendentes
        timeoutsFechamento.forEach(timer => clearTimeout(timer));
        timeoutsFechamento = []; // Limpa o array

        bot.sendMessage(chatId, "🛑 **Bot PARADO.**", { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, "❌ **Usuário ou senha incorretos.** Acesso negado.", { parse_mode: 'Markdown' });
    }
});

console.log("🤖 Sistema iniciado e pronto!");

// ==========================================
// 🌐 SERVIDOR WEB FALSO (Para não dormir na Render)
// ==========================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot rodando 24/7!'));
app.listen(PORT, () => console.log(`Servidor web escutando na porta ${PORT}`));