/* Liga dos Aprovados: interações. Código original do projeto. */
(() => {
  'use strict';

  /* =====================================================
     WHATSAPP DA DRA.: único lugar para trocar o número
     ===================================================== */
  const WHATSAPP = '5521993028795';

  /* =====================================================
     PIXEL DA META: cole aqui o ID quando a conta de
     anúncios estiver pronta (ex.: '1234567890').
     Vazio = nenhum rastreador carrega, nada é enviado.
     ===================================================== */
  const PIXEL_META = '';

  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- origem do lead (de qual anúncio veio) ----------
     Lê as utm da URL na primeira visita e guarda na sessão, para
     a origem sobreviver aos cliques em âncora dentro da página. */
  const CHAVE_ORIGEM = 'liga:origem';
  const guardar = (v) => { try { sessionStorage.setItem(CHAVE_ORIGEM, v); } catch (e) {} };
  const guardado = () => { try { return sessionStorage.getItem(CHAVE_ORIGEM) || ''; } catch (e) { return ''; } };
  const origemDoLead = (() => {
    const p = new URLSearchParams(location.search);
    const limpar = (s) => (s || '').replace(/[^\w .,\-\/]/g, '').trim().slice(0, 40);
    const partes = [p.get('utm_source'), p.get('utm_campaign'), p.get('utm_content')].map(limpar).filter(Boolean);
    if (partes.length) { const v = partes.join(' / '); guardar(v); return v; }
    const antes = guardado();
    if (antes) return antes;
    // sem utm: pelo menos registra de onde a pessoa chegou
    try {
      const ref = document.referrer && new URL(document.referrer).hostname.replace(/^www\./, '');
      if (ref && ref !== location.hostname) { guardar(ref); return ref; }
    } catch (e) {}
    return '';
  })();

  /* ---------- pixel da Meta (só se o ID estiver preenchido) ---------- */
  const marcar = (evento, dados) => { try { if (window.fbq) window.fbq('track', evento, dados); } catch (e) {} };
  if (PIXEL_META) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_META);
    window.fbq('track', 'PageView');
  }

  /* ---------- placar de flow: 10..50 -> ângulo -90..90 ---------- */
  const anguloDe = (pontos) => -90 + ((Math.min(50, Math.max(10, pontos)) - 10) / 40) * 180;
  const perfilDe = (pontos) => {
    if (pontos <= 20) return { chave: 'comfort', nome: 'Comfort', faixa: '10 a 20 pontos', cor: 'var(--comfort)' };
    if (pontos <= 30) return { chave: 'esteira', nome: 'Esteira', faixa: '21 a 30 pontos', cor: 'var(--esteira)' };
    if (pontos <= 40) return { chave: 'meteorico', nome: 'Meteórico', faixa: '31 a 40 pontos', cor: 'var(--meteorico)' };
    return { chave: 'flow', nome: 'Flow', faixa: '41 a 50 pontos', cor: 'var(--ouro-claro)' };
  };
  const pintarPlacar = (placar, pontos, legenda) => {
    if (!placar) return;
    placar.style.setProperty('--ang', anguloDe(pontos) + 'deg');
    const n = $('.numero', placar); if (n) n.textContent = String(pontos);
    const l = $('.numero-legenda', placar); if (l && legenda !== undefined) l.textContent = legenda;
  };

  /* hero: o placar decorativo sobe de Comfort a Flow ao entrar na tela */
  const placarHero = $('#placar-hero');
  if (placarHero) {
    const contar = () => {
      if (semMovimento) { pintarPlacar(placarHero, 44, 'Flow'); return; }
      const t0 = performance.now(), dur = 1800;
      const passo = (t) => {
        const p = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
        const v = Math.round(10 + e * 34);
        pintarPlacar(placarHero, v, perfilDe(v).nome);
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { contar(); io.disconnect(); } }, { threshold: .4 });
    io.observe(placarHero);
  }

  /* ---------- reveal ---------- */
  const reveals = $$('.reveal');
  if (reveals.length) {
    // rede de segurança: qualquer .reveal dentro da tela entra, mesmo sem observer
    let agendado = false;
    const marcarVisiveis = () => {
      agendado = false;
      const h = innerHeight;
      reveals.forEach(el => { if (el.classList.contains('in')) return; const r = el.getBoundingClientRect(); if (r.top < h * .96 && r.bottom > 0) el.classList.add('in'); });
    };
    const pedir = () => { if (!agendado) { agendado = true; requestAnimationFrame(marcarVisiveis); } };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
      reveals.forEach(el => io.observe(el));
    }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir, { passive: true });
    setTimeout(marcarVisiveis, 900);
    setTimeout(marcarVisiveis, 2500);
  }

  /* ---------- toast ---------- */
  let toastEl, toastTimer;
  const toast = (titulo, texto) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = `<b>${titulo}</b>${texto}`;
    requestAnimationFrame(() => toastEl.classList.add('visivel'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('visivel'), 5200);
  };

  /* ---------- quiz ---------- */
  const PERGUNTAS = [
    { t: 'Antes de uma prova importante, eu consigo controlar a ansiedade e focar no que tenho que fazer.' },
    { t: 'Quando estudo, mantenho o foco por pelo menos 25 minutos sem olhar o celular ou as redes.' },
    { t: 'Eu confio no que estudei e não deixo o medo de errar me atrapalhar.' },
    { t: 'Eu estudo e o conteúdo aparece na hora da prova, sem dar branco.', s: 'Pense na última prova ou simulado importante.' },
    { t: 'Eu tenho um ritual ou uma rotina pré-prova que me ajuda a entrar confiante.' },
    { t: 'Quando erro uma questão, uso o erro como aprendizado, sem me desmotivar.' },
    { t: 'Minha família sabe me apoiar antes da prova sem aumentar a pressão.' },
    { t: 'Eu mantenho a disciplina nos estudos mesmo nos dias em que não estou com vontade.' },
    { t: 'Já senti o estado de flow estudando: o tempo voa e eu aprendo muito mais.' },
    { t: 'De 0 a 10, quanto você confia que vai bem no próximo vestibular?', tipo: 'nota', s: '0 é nenhuma confiança, 10 é confiança total.' },
  ];
  const ESCALA = ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'];
  const LEITURA = {
    comfort: {
      texto: 'Você tem talento e sabe disso, mas a disciplina mental ainda é a parte frágil: precisa de cobrança externa para pagar o preço. É a zona de passividade. A boa notícia é que <b>esse é o perfil que mais cresce quando é mentorado</b>.',
      liga: 'Na Liga, o trabalho começa pela identidade e pela disciplina que gera liberdade: rotina de alta performance, ritual diário e acompanhamento semanal para você sair da zona de conforto sem depender de ninguém te cobrando.'
    },
    esteira: {
      texto: 'Você estuda muito, se dedica muito, e o resultado não acompanha o esforço. Absorve pouco do que lê, se cobra demais e sente que não sai do lugar. <b>É o perfil mais comum entre vestibulandos</b> (a média das turmas cai aqui).',
      liga: 'Na Liga, o foco é converter esforço em estratégia: gatilhos de flow para render mais em menos tempo, correção imediata das questões e a troca da autocobrança pelo comprometimento.'
    },
    meteorico: {
      texto: 'Você vive de altos e baixos: tira 10 numa matéria e trava na outra, arrasa num simulado e desaba no seguinte. Às vezes o excesso de confiança tira o foco. <b>Falta consistência, não capacidade</b>.',
      liga: 'Na Liga, o trabalho é de constância: equilíbrio desafio × habilidade, rituais pré-prova e frases de comando para entrar e sair da prova no mesmo estado, independente do resultado do dia.'
    },
    flow: {
      texto: 'Você já acessa o estado de flow, tem segurança e consistência, e provavelmente já ajuda os colegas. <b>O desafio agora é manter e ampliar</b>: no flow não há retrocesso, mas há o próximo nível.',
      liga: 'Na Liga, quem chega em flow treina para se manter lá sob pressão máxima: foco obsessivo, preparação pré-prova específica e o objetivo de passar em várias para poder escolher.'
    }
  };

  const quiz = $('#quiz');
  if (quiz) {
    const intro = $('.intro-quiz', quiz), etapa = $('.etapa', quiz), resultado = $('.resultado', quiz);
    const barra = $('.progresso i', quiz), passo = $('.quiz-passo', quiz);
    const perguntaEl = $('.pergunta', quiz), escalaEl = $('.escala', quiz);
    const btnVoltar = $('.voltar', quiz), placarQuiz = $('#placar-quiz'), placarRes = $('#placar-resultado');
    const respostas = new Array(PERGUNTAS.length).fill(null);
    let atual = 0;

    const parcial = () => respostas.reduce((s, v) => s + (v || 0), 0);
    const projetado = () => {
      // projeção do placar enquanto responde: respondidas + média das respondidas para o resto
      const resp = respostas.filter(v => v !== null);
      if (!resp.length) return 10;
      const media = resp.reduce((a, b) => a + b, 0) / resp.length;
      return Math.round(resp.reduce((a, b) => a + b, 0) + media * (PERGUNTAS.length - resp.length));
    };

    const render = () => {
      const q = PERGUNTAS[atual];
      passo.textContent = `Pergunta ${atual + 1} de ${PERGUNTAS.length}`;
      barra.style.width = `${(atual / PERGUNTAS.length) * 100}%`;
      perguntaEl.innerHTML = q.t + (q.s ? `<small>${q.s}</small>` : '');
      perguntaEl.classList.remove('entra'); void perguntaEl.offsetWidth; if (!semMovimento) perguntaEl.classList.add('entra');
      const legenda = $('.pontilha', quiz); if (legenda) legenda.textContent = q.tipo === 'nota' ? '0 nenhuma · 10 total' : '1 nunca · 5 sempre';
      escalaEl.innerHTML = '';
      escalaEl.classList.toggle('escala-11', q.tipo === 'nota');
      const opcoes = q.tipo === 'nota' ? [...Array(11).keys()] : [1, 2, 3, 4, 5];
      opcoes.forEach((v) => {
        const b = document.createElement('button');
        b.type = 'button';
        // a nota 0-10 da última pergunta vira 1-5 para somar com as outras
        const valorFinal = q.tipo === 'nota' ? Math.min(5, Math.max(1, Math.ceil((v + 1) / 2.2))) : v;
        b.innerHTML = q.tipo === 'nota' ? `<b>${v}</b>` : `<b>${v}</b><span>${ESCALA[v - 1]}</span>`;
        b.addEventListener('click', () => {
          $$('button', escalaEl).forEach(x => x.classList.remove('marcada'));
          b.classList.add('marcada');
          respostas[atual] = q.tipo === 'nota' ? valorFinal : v;
          pintarPlacar(placarQuiz, projetado(), perfilDe(projetado()).nome);
          setTimeout(() => (atual < PERGUNTAS.length - 1 ? (atual++, render()) : concluir()), 420);
        });
        escalaEl.appendChild(b);
      });
      btnVoltar.style.visibility = atual === 0 ? 'hidden' : 'visible';
      perguntaEl.focus({ preventScroll: true });
    };

    const concluir = () => {
      const total = parcial();
      const p = perfilDe(total);
      barra.style.width = '100%';
      etapa.hidden = true;
      resultado.classList.add('visivel');
      resultado.style.setProperty('--cor', p.cor);
      $('.res-perfil', resultado).textContent = p.nome;
      $('.res-faixa', resultado).textContent = `${total} de 50 pontos · faixa ${p.faixa}`;
      $('.res-texto', resultado).innerHTML = LEITURA[p.chave].texto;
      $('.res-liga', resultado).innerHTML = `<b>O que a Liga faz com esse perfil:</b> ${LEITURA[p.chave].liga}`;
      // agulha parte do início e anima pela transition do CSS; o número já vai
      // no valor final, para nunca contradizer o perfil se o quadro não rodar
      pintarPlacar(placarRes, 10, p.nome);
      void placarRes.offsetWidth;
      pintarPlacar(placarRes, total, p.nome);
      quiz.dataset.perfil = p.nome; quiz.dataset.pontos = String(total);
      marcar('CompleteRegistration', { content_name: 'teste-concluido', content_category: p.nome, value: total });
      resultado.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
    };

    $('.comecar', quiz).addEventListener('click', () => {
      marcar('ViewContent', { content_name: 'teste-iniciado' });
      intro.hidden = true; etapa.hidden = false; atual = 0; respostas.fill(null);
      pintarPlacar(placarQuiz, 10, 'Placar');
      render();
      etapa.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
    });
    btnVoltar.addEventListener('click', () => { if (atual > 0) { atual--; render(); } });
    $('.refazer', quiz).addEventListener('click', () => {
      resultado.classList.remove('visivel'); etapa.hidden = false; atual = 0; respostas.fill(null);
      delete quiz.dataset.perfil; delete quiz.dataset.pontos;
      pintarPlacar(placarQuiz, 10, 'Placar'); render();
      etapa.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
    });
    $('.pular', quiz).addEventListener('click', () => {
      intro.hidden = true; etapa.hidden = true; resultado.classList.add('visivel');
      $('.res-top', resultado).hidden = true;
      $('.form h3', resultado).textContent = 'Falar com a equipe da Dra.';
      $('.form p.sub', resultado).textContent = 'A mensagem vai pronta para o WhatsApp da Liga. A equipe responde com o próximo passo e as vagas da próxima turma.';
      $('.form', resultado).scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
    });

    // "Sou pai ou mãe" nos CTAs pré-seleciona o campo
    $$('[data-pai]').forEach(a => a.addEventListener('click', () => {
      const r = $('#quem-pai'); if (r) r.checked = true;
    }));

    /* veio de anúncio para pais? já marca "sou pai ou mãe" e fala com ele.
       Sem isso, o pai que não reparar no campo chega ao WhatsApp da Dra.
       classificado como vestibulando, e o atendimento começa errado. */
    const paraPais = /(^|[^a-z])pais?([^a-z]|$)|m[aã]e|filh/i.test(origemDoLead);
    if (paraPais) {
      const r = $('#quem-pai'); if (r) r.checked = true;
      const dica = $('.intro-quiz .pais-dica');
      if (dica) dica.innerHTML = '<b>Você chegou pelo anúncio para pais.</b> Responda pensando no seu filho ou na sua filha. Se preferir, pule e fale direto com a equipe.';
    }

    /* ---------- formulário -> WhatsApp ---------- */
    const form = $('#form-lead');
    const soDigitos = (s) => (s || '').replace(/\D/g, '');
    const mascara = (v) => {
      const d = soDigitos(v).slice(0, 11);
      if (d.length <= 2) return d;
      if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };
    const tel = $('#tel');
    tel.addEventListener('input', () => { tel.value = mascara(tel.value); });

    const validar = () => {
      let ok = true;
      const nome = $('#nome'), campoNome = nome.closest('.campo'), campoTel = tel.closest('.campo');
      campoNome.classList.toggle('invalido', nome.value.trim().length < 2); ok = ok && nome.value.trim().length >= 2;
      const d = soDigitos(tel.value); const telOk = d.length >= 10 && d.length <= 11;
      campoTel.classList.toggle('invalido', !telOk); ok = ok && telOk;
      return ok;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validar()) { toast('Falta um detalhe', 'Confira seu nome e o WhatsApp com DDD, aí é só enviar.'); $('.campo.invalido input', form)?.focus(); return; }
      const nome = $('#nome').value.trim();
      const quem = $('input[name="quem"]:checked', form)?.value || 'Vestibulando';
      const ano = $('#ano').value;
      const alvo = $('#alvo').value.trim();
      const perfil = quiz.dataset.perfil, pontos = quiz.dataset.pontos;
      const linhas = [
        `Olá, Dra. Maria Angélica! Vim pelo site da Liga dos Aprovados no Flow.`,
        `Nome: ${nome}`,
        `Quem está falando: ${quem}`,
        ano ? `Ano: ${ano}` : null,
        alvo ? `Vestibular ou curso alvo: ${alvo}` : null,
        perfil ? `Resultado do teste: perfil ${perfil.toUpperCase()}, ${pontos}/50` : `Ainda não fiz o teste`,
        `Quero saber como funciona a próxima turma da Liga.`,
        origemDoLead ? `(origem: ${origemDoLead})` : null
      ].filter(Boolean);
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(linhas.join('\n'))}`;
      marcar('Lead', { content_name: 'liga-whatsapp', content_category: perfil || 'sem-teste' });
      toast('Abrindo o WhatsApp', 'Sua mensagem já vai pronta. É só tocar em enviar.');
      // link de reserva visível: se o navegador (ex.: o do próprio WhatsApp) bloquear a abertura
      const fb = $('.fallback-wa', form);
      if (fb) { fb.innerHTML = `Se o WhatsApp não abriu, <a href="${url}" target="_blank" rel="noopener">toque aqui para abrir a conversa</a>.`; fb.classList.add('visivel'); }
      if (matchMedia('(pointer: coarse)').matches) { location.href = url; }
      else { const w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url; }
    });
  }

  /* ---------- FAQ: fecha os outros ao abrir um ---------- */
  $$('.faq details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('.faq details').forEach(o => { if (o !== d) o.open = false; }); }));
})();
