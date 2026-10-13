(function () {
    'use strict';

    var root = document.querySelector('[data-appointment-app]');
    if (!root) return;

    // Número oficial no formato internacional, sem espaços ou símbolos.
    var WHATSAPP_NUMBER = '5511974260437';
    var TIME_ZONE = 'America/Sao_Paulo';
    var services = [
        'Massagem relaxante',
        'Pedras quentes',
        'Massagem terapêutica',
        'Liberação miofascial com ventosas',
        'Drenagem linfática',
        'Eletroestimulação',
        'Auriculoterapia',
        'Cone hindu',
        'Kinesio tape'
    ];
    var recommendations = {
        'Dor nas costas ou cervical': ['Massagem terapêutica', 'Liberação miofascial com ventosas'],
        'Fibromialgia': ['Massagem relaxante'],
        'Estresse e insônia': ['Massagem relaxante', 'Pedras quentes'],
        'Ansiedade': ['Massagem relaxante'],
        'Inchaço / pós-operatório': ['Drenagem linfática'],
        'Lesão ou treino': ['Massagem terapêutica', 'Liberação miofascial com ventosas', 'Kinesio tape']
    };
    var needs = Object.keys(recommendations);
    var periods = ['Manhã', 'Tarde'];
    var weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    var stage = root.querySelector('[data-appointment-stage]');
    var liveRegion = root.querySelector('.appointment-live-region');
    var state = createInitialState();
    var today = getTodayParts();
    var visibleMonth = { year: today.year, month: today.month };

    function createInitialState() {
        return {
            step: 1,
            need: '',
            services: [],
            suggestedServices: [],
            date: '',
            period: '',
            name: '',
            serviceError: '',
            dateError: '',
            nameError: ''
        };
    }

    function getTodayParts() {
        var parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());
        var values = {};
        parts.forEach(function (part) {
            if (part.type !== 'literal') values[part.type] = Number(part.value);
        });
        return values;
    }

    function pad(number) {
        return String(number).padStart(2, '0');
    }

    function dateKey(year, month, day) {
        return year + '-' + pad(month) + '-' + pad(day);
    }

    function dateFromKey(key) {
        var parts = key.split('-').map(Number);
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
    }

    function formatDate(key, includeYear) {
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: TIME_ZONE,
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: includeYear ? 'numeric' : undefined
        }).format(dateFromKey(key));
    }

    function formatMonth(year, month) {
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: TIME_ZONE,
            month: 'long',
            year: 'numeric'
        }).format(new Date(Date.UTC(year, month - 1, 15, 12)));
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#039;',
                '"': '&quot;'
            }[character];
        });
    }

    function optionButtons(items, selected, group) {
        return items.map(function (item) {
            var isSelected = Array.isArray(selected) ? selected.indexOf(item) !== -1 : selected === item;
            return '<button class="appointment-option" type="button" data-option-group="' + group + '" data-value="' + escapeHtml(item) + '" aria-pressed="' + isSelected + '">' + escapeHtml(item) + '</button>';
        }).join('');
    }

    function updateProgress() {
        var visibleStep = state.step === 4 ? 3 : state.step;
        root.querySelectorAll('[data-progress-step]').forEach(function (item) {
            var itemStep = Number(item.getAttribute('data-progress-step'));
            item.classList.toggle('is-active', itemStep === visibleStep);
            item.classList.toggle('is-complete', itemStep < visibleStep);
            if (itemStep === visibleStep) item.setAttribute('aria-current', 'step');
            else item.removeAttribute('aria-current');
        });
    }

    function announce(message) {
        liveRegion.textContent = '';
        window.setTimeout(function () { liveRegion.textContent = message; }, 20);
    }

    function render() {
        root.setAttribute('data-current-step', state.step);
        updateProgress();
        if (state.step === 1) renderServices();
        else if (state.step === 2) renderDate();
        else if (state.step === 3) renderName();
        else renderSummary();
    }

    function renderServices() {
        stage.innerHTML = '<div class="appointment-step" data-step="services">' +
            '<div class="appointment-step-header"><h3>O que você deseja?</h3><p>Você pode escolher mais de uma técnica. Se quiser, conte também o que está sentindo.</p></div>' +
            '<div class="appointment-subsection"><h4>Onde está a sua tensão?</h4><p class="appointment-helper">Este campo é opcional. Marque uma necessidade para incluí-la na avaliação presencial.</p>' +
            '<div class="appointment-options" aria-label="Necessidade opcional">' + optionButtons(needs, state.need, 'need') + '</div>' +
            '<p class="appointment-disclaimer">Esta seleção é apenas informativa. A técnica mais adequada depende da avaliação da profissional e, quando aplicável, de liberação médica.</p></div>' +
            '<div class="appointment-subsection"><h4>Escolha uma ou mais técnicas</h4><p class="appointment-helper">Selecione pelo menos uma opção para continuar.</p>' +
            (state.need ? '<p class="appointment-recommendation"><strong>Sugestões iniciais para sua avaliação:</strong> ' + escapeHtml(recommendations[state.need].join(', ')) + '. Você pode alterar as opções livremente.</p>' : '') +
            '<div class="appointment-options" aria-label="Técnicas disponíveis">' + optionButtons(services, state.services, 'service') + '</div>' +
            (state.serviceError ? '<p class="appointment-error" id="service-error" role="alert">' + state.serviceError + '</p>' : '') + '</div>' +
            '<div class="appointment-actions appointment-actions-end"><button class="appointment-button" type="button" data-action="next-services">Continuar</button></div></div>';
    }

    function renderDate() {
        stage.innerHTML = '<div class="appointment-step" data-step="date">' +
            '<div class="appointment-step-header"><h3>Qual o melhor dia para você?</h3><p>Escolha uma data e um período de preferência. O horário exato será confirmado pela Lu.</p></div>' +
            '<div class="appointment-date-layout"><div>' + calendarMarkup() + '</div>' +
            '<div class="appointment-periods"><h4>Período preferido</h4><p class="appointment-helper">A escolha indica sua preferência, não um horário confirmado.</p>' +
            '<div class="appointment-options" aria-label="Período preferido">' + optionButtons(periods, state.period, 'period') + '</div>' +
            (state.date ? '<p class="appointment-selection-note">Dia escolhido: ' + escapeHtml(formatDate(state.date, true)) + '.</p>' : '') +
            (state.dateError ? '<p class="appointment-error" id="date-error" role="alert">' + state.dateError + '</p>' : '') + '</div></div>' +
            '<div class="appointment-actions"><button class="appointment-button appointment-button-secondary" type="button" data-action="back">Voltar</button>' +
            '<button class="appointment-button" type="button" data-action="next-date">Continuar</button></div></div>';
    }

    function calendarMarkup() {
        var firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1, 12)).getUTCDay();
        var daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0, 12)).getUTCDate();
        var currentMonthKey = dateKey(today.year, today.month, 1);
        var visibleMonthKey = dateKey(visibleMonth.year, visibleMonth.month, 1);
        var cells = weekdays.map(function (day) {
            return '<div class="appointment-calendar-weekday" aria-hidden="true">' + day + '</div>';
        });
        var index;

        for (index = 0; index < firstWeekday; index += 1) {
            cells.push('<span class="appointment-calendar-blank" aria-hidden="true"></span>');
        }

        for (index = 1; index <= daysInMonth; index += 1) {
            var key = dateKey(visibleMonth.year, visibleMonth.month, index);
            var isPast = key < dateKey(today.year, today.month, today.day);
            var isSunday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, index, 12)).getUTCDay() === 0;
            var isToday = key === dateKey(today.year, today.month, today.day);
            var isSelected = key === state.date;
            var dayLabel = formatDate(key, true) + (isSunday ? ', indisponível aos domingos' : '');
            cells.push('<button class="appointment-calendar-day" type="button" data-date="' + key + '" aria-label="' + escapeHtml(dayLabel) + '" aria-pressed="' + isSelected + '"' +
                (isToday ? ' aria-current="date"' : '') + (isPast || isSunday ? ' disabled' : '') + '>' + index + '</button>');
        }

        return '<div class="appointment-calendar" aria-label="Calendário para escolher a data">' +
            '<div class="appointment-calendar-header"><h4 class="appointment-calendar-title" aria-live="polite">' + escapeHtml(formatMonth(visibleMonth.year, visibleMonth.month)) + '</h4>' +
            '<div class="appointment-calendar-nav"><button type="button" data-action="previous-month" aria-label="Mês anterior"' + (visibleMonthKey <= currentMonthKey ? ' disabled' : '') + '>&lsaquo;</button>' +
            '<button type="button" data-action="next-month" aria-label="Próximo mês">&rsaquo;</button></div></div>' +
            '<div class="appointment-calendar-grid" role="grid">' + cells.join('') + '</div>' +
            '<p class="appointment-calendar-note">Domingos estão indisponíveis conforme o horário de funcionamento.</p></div>';
    }

    function renderName() {
        stage.innerHTML = '<div class="appointment-step" data-step="name">' +
            '<div class="appointment-step-header"><h3>Só falta mais um detalhe</h3><p>Informe seu nome para que a Lu possa identificar sua solicitação.</p></div>' +
            '<div class="appointment-field"><label for="appointment-name">Nome</label>' +
            '<input class="appointment-name-input" id="appointment-name" name="name" type="text" autocomplete="name" required maxlength="80" placeholder="Como você gostaria de ser chamado?" value="' + escapeHtml(state.name) + '" aria-invalid="' + Boolean(state.nameError) + '"' + (state.nameError ? ' aria-describedby="name-error"' : '') + '>' +
            (state.nameError ? '<p class="appointment-error" id="name-error" role="alert">' + state.nameError + '</p>' : '') + '</div>' +
            '<div class="appointment-actions"><button class="appointment-button appointment-button-secondary" type="button" data-action="back">Voltar</button>' +
            '<button class="appointment-button" type="button" data-action="next-name">Continuar</button></div></div>';
    }

    function renderSummary() {
        var needSummary = state.need ? '<div><dt>Observação</dt><dd>Pela avaliação do site: ' + escapeHtml(state.need) + '.</dd></div>' : '';
        stage.innerHTML = '<div class="appointment-step" data-step="summary">' +
            '<div class="appointment-step-header"><h3>Resumo do pedido</h3><p>Confira os dados antes de abrir sua solicitação no WhatsApp.</p></div>' +
            '<dl class="appointment-summary"><div><dt>Serviços</dt><dd>' + escapeHtml(state.services.join(', ')) + '.</dd></div>' +
            '<div><dt>Dia</dt><dd>' + escapeHtml(formatDate(state.date, true)) + '.</dd></div>' +
            '<div><dt>Período</dt><dd>' + escapeHtml(state.period) + '.</dd></div>' +
            '<div><dt>Nome</dt><dd>' + escapeHtml(state.name) + '.</dd></div>' + needSummary + '</dl>' +
            '<p class="appointment-confirmation-note">O horário exato será confirmado pela Lu pelo WhatsApp.</p>' +
            '<div class="appointment-actions"><button class="appointment-button appointment-button-secondary" type="button" data-action="back">Voltar</button>' +
            '<button class="appointment-reset" type="button" data-action="reset">Recomeçar</button>' +
            '<a class="appointment-button" data-action="send" href="' + escapeHtml(buildWhatsappUrl()) + '" target="_blank" rel="noopener noreferrer">Enviar</a></div></div>';
    }

    function buildMessage() {
        var lines = [
            'Olá, Lu! Vim pelo site e quero agendar uma sessão.',
            '',
            '*Técnica(s):* ' + state.services.join(', ') + '.',
            '',
            '*Dia:* ' + formatDate(state.date, false) + '.',
            '',
            '*Período:* ' + state.period + '.',
            '',
            '*Nome:* ' + state.name + '.'
        ];
        if (state.need) {
            lines.push('', '*Obs.:* Pela avaliação do site: ' + state.need + '.');
        }
        lines.push('', 'Pode confirmar o horário por favor?');
        return lines.join('\n');
    }

    function buildWhatsappUrl() {
        return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildMessage());
    }

    function focusHeading() {
        var heading = stage.querySelector('.appointment-step-header h3');
        if (!heading) return;
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        root.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }

    function changeStep(nextStep, message) {
        state.step = nextStep;
        render();
        announce(message);
        focusHeading();
    }

    function focusOption(group, value) {
        var options = stage.querySelectorAll('[data-option-group="' + group + '"]');
        for (var index = 0; index < options.length; index += 1) {
            if (options[index].getAttribute('data-value') === value) {
                options[index].focus();
                return;
            }
        }
    }

    root.addEventListener('click', function (event) {
        var option = event.target.closest('[data-option-group]');
        var actionElement = event.target.closest('[data-action]');
        var dateButton = event.target.closest('[data-date]');

        if (option) {
            var group = option.getAttribute('data-option-group');
            var value = option.getAttribute('data-value');
            if (group === 'service') {
                var serviceIndex = state.services.indexOf(value);
                if (serviceIndex === -1) state.services.push(value);
                else {
                    state.services.splice(serviceIndex, 1);
                    var suggestedIndex = state.suggestedServices.indexOf(value);
                    if (suggestedIndex !== -1) state.suggestedServices.splice(suggestedIndex, 1);
                }
                state.serviceError = '';
            } else if (group === 'need') {
                state.services = state.services.filter(function (service) {
                    return state.suggestedServices.indexOf(service) === -1;
                });
                state.suggestedServices = [];
                state.need = state.need === value ? '' : value;
                if (state.need) {
                    recommendations[state.need].forEach(function (service) {
                        if (state.services.indexOf(service) === -1) {
                            state.services.push(service);
                            state.suggestedServices.push(service);
                        }
                    });
                    state.serviceError = '';
                }
            } else {
                state.period = state.period === value ? '' : value;
                state.dateError = '';
            }
            render();
            focusOption(group, value);
            if (group === 'need' && state.need) {
                announce('Sugestões adicionadas: ' + recommendations[state.need].join(', ') + '. Você pode alterar as opções.');
            }
            return;
        }

        if (dateButton) {
            state.date = dateButton.getAttribute('data-date');
            state.dateError = '';
            render();
            stage.querySelector('[data-date="' + state.date + '"]').focus();
            announce('Data selecionada: ' + formatDate(state.date, true));
            return;
        }

        if (!actionElement) return;
        var action = actionElement.getAttribute('data-action');

        if (action === 'next-services') {
            if (!state.services.length) {
                state.serviceError = 'Selecione pelo menos uma técnica para continuar.';
                render();
                stage.querySelector('[data-option-group="service"]').focus();
                announce(state.serviceError);
                return;
            }
            changeStep(2, 'Etapa de data e período.');
        } else if (action === 'next-date') {
            if (!state.date || !state.period) {
                state.dateError = !state.date && !state.period ? 'Escolha uma data e um período para continuar.' : (!state.date ? 'Escolha uma data para continuar.' : 'Escolha um período para continuar.');
                render();
                stage.querySelector(!state.date ? '.appointment-calendar-day:not(:disabled)' : '[data-option-group="period"]').focus();
                announce(state.dateError);
                return;
            }
            changeStep(3, 'Etapa de identificação.');
        } else if (action === 'next-name') {
            var nameInput = stage.querySelector('#appointment-name');
            state.name = nameInput.value.trim().replace(/\s+/g, ' ');
            if (state.name.length < 2) {
                state.nameError = 'Informe seu nome com pelo menos 2 caracteres.';
                render();
                stage.querySelector('#appointment-name').focus();
                announce(state.nameError);
                return;
            }
            state.nameError = '';
            changeStep(4, 'Resumo do pedido.');
        } else if (action === 'back') {
            changeStep(Math.max(1, state.step - 1), 'Etapa anterior.');
        } else if (action === 'previous-month' || action === 'next-month') {
            visibleMonth.month += action === 'next-month' ? 1 : -1;
            if (visibleMonth.month === 13) {
                visibleMonth.month = 1;
                visibleMonth.year += 1;
            } else if (visibleMonth.month === 0) {
                visibleMonth.month = 12;
                visibleMonth.year -= 1;
            }
            render();
            var monthControl = stage.querySelector('[data-action="' + action + '"]');
            if (monthControl.disabled) monthControl = stage.querySelector('[data-action="next-month"]');
            monthControl.focus();
        } else if (action === 'reset') {
            state = createInitialState();
            visibleMonth = { year: today.year, month: today.month };
            render();
            announce('Agendamento reiniciado.');
            focusHeading();
        }
    });

    root.addEventListener('input', function (event) {
        if (event.target.id === 'appointment-name') {
            state.name = event.target.value;
            state.nameError = '';
            event.target.setAttribute('aria-invalid', 'false');
        }
    });

    render();
}());
