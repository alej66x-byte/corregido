let requisicionesData = [];
let requisicionesFiltradas = [];
let requisicionesGruposFiltrados = [];
let paginaActualReq = 1;
const registrosPorPaginaReq = 5;

let candidatosPendientesReq = [];
let candidatosGuardadosReq = [];
let resultadosBusquedaReq = [];

let reqModalState = {
    idRequisicion: 0,
    idDetalleTurno: null,
    idTurno: null,
    turnoNombre: "",
    cantidadInicial: 0,
    restante: 0,
    adquiridos: 0,
    activeTab: "buscar"
};

let detalleRequisicionActual = null;


//function initIndexDashboard() {
//    bindBusquedaRequisiciones();
//    bindPaginacionRequisiciones();
//    cargarDashboardRequisiciones();
//    bindReqBootstrapModal();
//    bindDetalleRequisicionEvents();
//    bindCambiarEstatusCandidatoEvents();
//    bindChecklistCandidatoEvents();
//}

function initIndexDashboard() {
    bindBusquedaRequisiciones();
    bindPaginacionRequisiciones();
    cargarDashboardRequisiciones();
    bindReqBootstrapModal();
    bindDetalleRequisicionEvents();
    bindCambiarEstatusCandidatoEvents();
    bindChecklistCandidatoEvents();
    bindContratarCandidatoEvents();
    bindChecklistSeguimientoEvents();
}

window.IndexDashboard = {
    refresh: function () {
        cargarDashboardRequisiciones();
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIndexDashboard);
} else {
    initIndexDashboard();
}

function bindBusquedaRequisiciones() {
    const input = document.getElementById("txtBuscarRequisicion");
    if (!input) return;

    input.addEventListener("input", function () {
        paginaActualReq = 1;
        filtrarRequisiciones(this.value);
    });
}

function bindPaginacionRequisiciones() {
    const btnAnterior = document.getElementById("btnReqAnterior");
    const btnSiguiente = document.getElementById("btnReqSiguiente");

    if (btnAnterior) {
        btnAnterior.addEventListener("click", function () {
            if (paginaActualReq > 1) {
                paginaActualReq--;
                renderTablaPaginada();
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", function () {
            const totalPaginas = obtenerTotalPaginasReq();
            if (paginaActualReq < totalPaginas) {
                paginaActualReq++;
                renderTablaPaginada();
            }
        });
    }
}

function cargarDashboardRequisiciones() {
    $.ajax({
        url: window.appUrls.dashboardRequisiciones,
        type: "GET",
        dataType: "json",
        cache: false,
        data: { _: new Date().getTime() },
        success: function (data) {
            if (!data) return;

            requisicionesData = data.Registros || [];
            console.log("Dashboard completo:", data);
            console.table(requisicionesData);
            console.log("Primer registro:", requisicionesData[0]);
            requisicionesFiltradas = [...requisicionesData];
            requisicionesGruposFiltrados = agruparRequisicionesPorFolio(requisicionesFiltradas);
            paginaActualReq = 1;

            renderStats(data.Stats);
            renderTablaPaginada();
            renderAside(data.UltimaRequisicion);
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar dashboard:", error);
            console.error(xhr.responseText);

            $("#tblRequisicionesBody").html(`
                <tr>
                    <td colspan="10" class="text-center">Ocurrió un error al cargar la información.</td>
                </tr>
            `);

            $("#txtRequisicionesFooter").text("Mostrando 0 registros");
            actualizarPaginacionReq();
        }
    });
}

function filtrarRequisiciones(texto) {
    const filtro = (texto || "").toLowerCase().trim();

    if (!filtro) {
        requisicionesFiltradas = [...requisicionesData];
    } else {
        requisicionesFiltradas = requisicionesData.filter(function (item) {
            const id = String(item.idRequisicion || "").toLowerCase();
            const posicion = String(item.PosicionDescripcion || item.Posicion || "").toLowerCase();
            const categoria = String(item.Categoria || "").toLowerCase();
            const turno = String(item.TurnoNombre || "").toLowerCase();
            const departamento = String(item.Departamento || "").toLowerCase();
            const publicacion = String(item.Publicacion || "").toLowerCase();

            return id.includes(filtro) ||
                posicion.includes(filtro) ||
                categoria.includes(filtro) ||
                turno.includes(filtro) ||
                departamento.includes(filtro) ||
                publicacion.includes(filtro);
        });
    }

    requisicionesGruposFiltrados = agruparRequisicionesPorFolio(requisicionesFiltradas);
    renderTablaPaginada();
}

function obtenerTotalPaginasReq() {
    return Math.max(1, Math.ceil(requisicionesGruposFiltrados.length / registrosPorPaginaReq));
}

function renderTablaPaginada() {
    requisicionesGruposFiltrados = agruparRequisicionesPorFolio(requisicionesFiltradas);

    const totalPaginas = obtenerTotalPaginasReq();

    if (paginaActualReq > totalPaginas) {
        paginaActualReq = totalPaginas;
    }

    const inicio = (paginaActualReq - 1) * registrosPorPaginaReq;
    const fin = inicio + registrosPorPaginaReq;
    const pagina = requisicionesGruposFiltrados.slice(inicio, fin);

    renderTabla(pagina);
    actualizarPaginacionReq();
}

function actualizarPaginacionReq() {
    const totalRegistros = requisicionesGruposFiltrados.length;
    const totalPaginas = obtenerTotalPaginasReq();

    const btnAnterior = document.getElementById("btnReqAnterior");
    const btnSiguiente = document.getElementById("btnReqSiguiente");
    const txtPagina = document.getElementById("txtReqPagina");

    if (btnAnterior) btnAnterior.disabled = paginaActualReq <= 1;
    if (btnSiguiente) btnSiguiente.disabled = paginaActualReq >= totalPaginas;
    if (txtPagina) txtPagina.textContent = `Página ${paginaActualReq} de ${totalPaginas}`;

    if (totalRegistros === 0) {
        $("#txtRequisicionesFooter").text("Mostrando 0 registros");
        return;
    }

    const desde = ((paginaActualReq - 1) * registrosPorPaginaReq) + 1;
    const hasta = Math.min(paginaActualReq * registrosPorPaginaReq, totalRegistros);

    $("#txtRequisicionesFooter").text(`Mostrando ${desde} a ${hasta} de ${totalRegistros} requisición(es)`);
}

function renderStats(stats) {
    $("#statTotalRequisiciones").text(stats?.TotalRequisiciones ?? 0);
    $("#statSalary").text(stats?.TotalSalary ?? 0);
    $("#statConfidenciales").text(stats?.TotalConfidenciales ?? 0);
}

function agruparRequisicionesPorFolio(registros) {
    const map = {};

    (registros || []).forEach(function (item) {
        const id = String(item.idRequisicion || "");

        if (!map[id]) {
            map[id] = {
                ...item,
                TurnosDetalle: [],
                CantidadTotalGrupo: 0
            };
        }

        const cantidadTurno = parseInt(item.Cantidad || 0, 10) || 0;
        const adquiridosTurno = parseInt(item.Cantidad_AdquiridosTurno ?? item.CantidadAdquiridosTurno ?? 0, 10) || 0;
        const restanteTurno = parseInt(item.CantidadRestanteTurno ?? item.RestanteTurno ?? Math.max(0, cantidadTurno - adquiridosTurno), 10) || 0;

        map[id].TurnosDetalle.push({
            idDetalleTurno: item.idDetalleTurno || item.IdDetalleTurno || null,
            IdTurno: item.IdTurno,
            TurnoNombre: item.TurnoNombre || "-",
            Cantidad: cantidadTurno,
            Cantidad_Adquiridos: parseInt(item.Cantidad_AdquiridosTurno ?? 0, 10) || 0,
            CantidadRestante: parseInt(item.CantidadRestanteTurno ?? Math.max(0, cantidadTurno), 10) || 0
        });

        map[id].CantidadTotalGrupo += cantidadTurno;
    });

    return Object.values(map).map(function (grupo) {
        const turnosUnicos = [];

        grupo.TurnosDetalle.forEach(function (turno) {
            const key = String(turno.idDetalleTurno || "") + "|" + String(turno.IdTurno || "");

            const existente = turnosUnicos.find(function (x) {
                const keyExistente = String(x.idDetalleTurno || "") + "|" + String(x.IdTurno || "");
                return keyExistente === key;
            });

            if (existente) {
                existente.Cantidad += parseInt(turno.Cantidad || 0, 10) || 0;
                existente.Cantidad_Adquiridos += parseInt(turno.Cantidad_Adquiridos || 0, 10) || 0;
                existente.CantidadRestante = Math.max(0, existente.Cantidad - existente.Cantidad_Adquiridos);
            } else {
                turnosUnicos.push({
                    idDetalleTurno: turno.idDetalleTurno,
                    IdTurno: turno.IdTurno,
                    TurnoNombre: turno.TurnoNombre || "-",
                    Cantidad: parseInt(turno.Cantidad || 0, 10) || 0,
                    Cantidad_Adquiridos: parseInt(turno.Cantidad_Adquiridos || 0, 10) || 0,
                    CantidadRestante: parseInt(turno.CantidadRestante || 0, 10) || 0
                });
            }
        });

        grupo.TurnosDetalle = turnosUnicos;
        grupo.TieneTurnosMultiples = turnosUnicos.length > 1 ? 1 : 0;
        grupo.TotalTurnosDetalle = turnosUnicos.length;

        if (turnosUnicos.length > 1) {
            grupo.Cantidad = grupo.CantidadTotalGrupo;
        }

        return grupo;
    });
}

function renderTabla(registros) {
    const tbody = $("#tblRequisicionesBody");
    tbody.html("");

    if (!registros || registros.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="10" class="text-center">No hay requisiciones registradas.</td>
            </tr>
        `);
        return;
    }

    $.each(registros, function (index, item) {
        const fecha = formatearFechaMvc(item.FechaRegistro);
        const tieneMultiplesTurnos = parseInt(item.TieneTurnosMultiples || 0, 10) === 1;
        const collapseId = `turnosReq_${item.idRequisicion}`;

        const turnoCell = tieneMultiplesTurnos
            ? `
                <button type="button"
                        class="btn-turnos-toggle btnToggleTurnosReq"
                        data-target="${escapeAttr(collapseId)}"
                        title="Ver distribución de turnos">
                    <i class="fa-solid fa-chevron-down"></i>
                    <span>${escapeHtml(item.TotalTurnosDetalle || 0)} turnos</span>
                </button>
              `
            : `
                <div class="turno-desc-cell" title="${escapeAttr(item.TurnoNombre || "-")}">
                    ${escapeHtml(item.TurnoNombre || "-")}
                </div>
              `;

        const row = `
            <tr class="req-parent-row" data-req="${escapeAttr(item.idRequisicion)}">
                <td><span class="turno-id-badge">#${escapeHtml(item.idRequisicion)}</span></td>

                <td>
                    <div class="turno-name-block">
                        <div class="turno-name-text">${escapeHtml(item.PosicionDescripcion || item.Posicion || "")}</div>
                        <div class="turno-name-sub">${escapeHtml(item.Departamento || "")}</div>
                    </div>
                </td>

                <td>
                    <span class="req-badge ${escapeAttr((item.Categoria || '').toLowerCase())}">
                        ${escapeHtml(item.Categoria || "-")}
                    </span>
                </td>

                <td>
                    ${turnoCell}
                </td>

                <td><span class="turno-id-badge">${escapeHtml(item.Cantidad || 0)}</span></td>
                <td><span class="turno-id-badge">${escapeHtml(item.CantidadRestante || 0)}</span></td>
                <td><span class="turno-id-badge">${escapeHtml(item.Cantidad_Adquiridos || 0)}</span></td>

                <td>
                    <div class="turno-desc-cell" title="${escapeAttr(fecha)}">
                        ${escapeHtml(fecha)}
                    </div>
                </td>

                <td>
                    <div class="turno-desc-cell" title="${escapeAttr(item.DiasPasados || 0)}">
                        ${escapeHtml(item.DiasPasados || 0)}
                    </div>
                </td>

                <td class="text-center">
                    <div class="table-actions">
                      ${tieneMultiplesTurnos ? `
    <button class="icon-btn btnToggleTurnosReq"
            title="Primero selecciona un turno"
            data-target="${escapeAttr(collapseId)}">
        <i class="fa-solid fa-clock"></i>
    </button>
` : `
    <button class="icon-btn btnMoverCantidad"
            title="Administrar candidatos"
            data-id="${escapeAttr(item.idRequisicion)}"
            data-iddetalleturno=""
            data-idturno="${escapeAttr(item.IdTurno || "")}"
            data-turno="${escapeAttr(item.TurnoNombre || "")}"
            data-cantidad="${escapeAttr(item.Cantidad || 0)}"
            data-restante="${escapeAttr(item.CantidadRestante || 0)}"
            data-adquiridos="${escapeAttr(item.Cantidad_Adquiridos || 0)}">
        <i class="fa-solid fa-users"></i>
    </button>
`}

                        <button class="icon-btn btnVerDetalleReq"
                                title="Ver detalle"
                                data-id="${escapeAttr(item.idRequisicion)}">
                            <i class="fa-regular fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;

        tbody.append(row);

        if (tieneMultiplesTurnos) {
            tbody.append(renderTurnosDetalleRows(item, collapseId));
        }
    });

    bindMoverCantidadEvents();
    bindToggleTurnosReq();
}


function renderTurnosDetalleRows(item, collapseId) {
    let html = `
        <tr class="req-turnos-detail-row ${escapeAttr(collapseId)}" style="display:none;">
            <td colspan="10">
                <div class="req-turnos-detail-box">
                    <div class="req-turnos-detail-title">
                        <i class="fa-solid fa-clock"></i>
                        Distribución por turnos
                    </div>

                    <div class="req-turnos-detail-grid">
    `;

    (item.TurnosDetalle || []).forEach(function (turno) {
        html += `
            <div class="req-turno-detail-card req-turno-detail-card-action">
                <div class="req-turno-detail-icon">
                    <i class="fa-regular fa-clock"></i>
                </div>

                <div class="req-turno-detail-info">
                    <div class="req-turno-detail-name">${escapeHtml(turno.TurnoNombre || "-")}</div>
                    <div class="req-turno-detail-sub">
                        Cantidad: <b>${escapeHtml(turno.Cantidad || 0)}</b>
                        · Restante: <b>${escapeHtml(turno.CantidadRestante || 0)}</b>
                        · Adquiridos: <b>${escapeHtml(turno.Cantidad_Adquiridos || 0)}</b>
                    </div>
                </div>

                <div class="req-turno-detail-actions">
                    <button type="button"
                            class="req-action-btn add btnMoverCantidad"
                            title="Administrar candidatos de este turno"
                            data-id="${escapeAttr(item.idRequisicion)}"
                            data-iddetalleturno="${escapeAttr(turno.idDetalleTurno || "")}"
                            data-idturno="${escapeAttr(turno.IdTurno || "")}"
                            data-turno="${escapeAttr(turno.TurnoNombre || "")}"
                            data-cantidad="${escapeAttr(turno.Cantidad || 0)}"
                            data-restante="${escapeAttr(turno.CantidadRestante || 0)}"
                            data-adquiridos="${escapeAttr(turno.Cantidad_Adquiridos || 0)}">
                        <i class="fa-solid fa-users"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>
            </td>
        </tr>
    `;

    return html;
}

function bindToggleTurnosReq() {
    $(".btnToggleTurnosReq")
        .off("click")
        .on("click", function () {
            const btn = $(this);
            const target = btn.data("target");

            if (!target) return;

            const rows = $("." + target);
            const visible = rows.is(":visible");

            rows.toggle(!visible);
            btn.toggleClass("open", !visible);

            btn.find("i")
                .removeClass("fa-chevron-down fa-chevron-up")
                .addClass(!visible ? "fa-chevron-up" : "fa-chevron-down");
        });
}

function renderAside(item) {
    if (!item) return;

    const fecha = formatearFechaMvc(item.FechaRegistro);

    $("#dashReqId").text(`#${item.idRequisicion || "--"}`);
    $("#dashPosicion").text(item.PosicionDescripcion || item.Posicion || "--");
    $("#dashCategoria").text(item.Categoria || "--");
    $("#dashTurno").text(item.TurnoNombre || "--");
    $("#dashTipoReq").text(item.Tipo_Requisicion || "--");
    $("#dashTipoContrato").text(item.Tipo_Contrato || "--");
    $("#dashGerente").text(item.Gerente || "--");
    $("#dashSupervisor").text(item.Supervisor || "--");
    $("#dashDepartamento").text(item.Departamento || "--");
    $("#dashCantidad").text(item.Cantidad ?? "--");
    $("#dashPublicacion").text(item.Publicacion || "--");
    $("#dashAdquiridos").text(item.Cantidad_Adquiridos ?? 0);
    $("#dashRestante").text(item.CantidadRestante ?? 0);
    $("#dashFechaRegistro").text(fecha);
    $("#dashDiasPasados").text(item.DiasPasados ?? 0);
}

function bindMoverCantidadEvents() {
    $(".btnMoverCantidad").off("click").on("click", function () {
        const btn = $(this);

        reqModalState = {
            idRequisicion: parseInt(btn.data("id"), 10) || 0,
            idDetalleTurno: btn.data("iddetalleturno") ? parseInt(btn.data("iddetalleturno"), 10) : null,
            idTurno: btn.data("idturno") ? parseInt(btn.data("idturno"), 10) : null,
            turnoNombre: btn.data("turno") || "",
            cantidadInicial: parseInt(btn.data("cantidad"), 10) || 0,
            restante: parseInt(btn.data("restante"), 10) || 0,
            adquiridos: parseInt(btn.data("adquiridos"), 10) || 0,
            activeTab: "buscar"
        };

        console.log("Modal candidatos state:", reqModalState);

        candidatosPendientesReq = [];
        candidatosGuardadosReq = [];
        resultadosBusquedaReq = [];

        actualizarTituloModalCandidatosPorTurno();
        actualizarResumenReqModal();
        renderTablaPendientesReq();

        cargarCandidatosGuardadosReq(
            reqModalState.idRequisicion,
            reqModalState.idDetalleTurno
        );

        switchReqTab("buscar");

        $("#boxResultadoBusquedaReq").html(`
            <div class="req-empty-box">
                <i class="fa-regular fa-folder-open"></i>
                <span>Aún no hay resultados. Usa el buscador para encontrar candidatos.</span>
            </div>
        `);

        $("#txtBuscarCandidatoReq").val("");
        $("#msgBusquedaReq").html("");

        const modalEl = document.getElementById("modalAdministrarCandidatos");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        setTimeout(() => {
            $("#txtBuscarCandidatoReq").trigger("focus");
        }, 150);
    });
}

function actualizarTituloModalCandidatosPorTurno() {
    const titulo = $(".req-bs-title");
    const subtitulo = $(".req-bs-subtitle");

    if (!titulo.length || !subtitulo.length) return;

    if (reqModalState.idDetalleTurno && reqModalState.turnoNombre) {
        titulo.html("Administrar candidatos");
        subtitulo.html(`
            Requisición #${escapeHtml(reqModalState.idRequisicion)}
            · Turno: <b>${escapeHtml(reqModalState.turnoNombre)}</b>
        `);
        return;
    }

    titulo.html("Administrar candidatos");
    subtitulo.html("Busca, agrega o elimina candidatos de esta requisición.");
}

//function actualizarTituloModalCandidatosPorTurno() {
//    const titulo = $(".req-bs-title");
//    const subtitulo = $(".req-bs-subtitle");

//    if (!titulo.length || !subtitulo.length) return;

//    if (reqModalState.idDetalleTurno && reqModalState.turnoNombre) {
//        titulo.html(`Administrar candidatos`);
//        subtitulo.html(`
//            Requisición #${escapeHtml(reqModalState.idRequisicion)}
//            · Turno: <b>${escapeHtml(reqModalState.turnoNombre)}</b>
//        `);
//        return;
//    }

//    titulo.html("Administrar candidatos");
//    subtitulo.html("Busca, agrega o elimina candidatos de esta requisición.");
//}

function bindReqBootstrapModal() {
    $(document)
        .off("click", ".req-tab-btn")
        .on("click", ".req-tab-btn", function () {
            const tab = $(this).data("tab");
            switchReqTab(tab);
        });

    $(document)
        .off("click", "#btnBuscarCandidatoReq")
        .on("click", "#btnBuscarCandidatoReq", function () {
            buscarCandidatosReq();
        });

    $(document)
        .off("keypress", "#txtBuscarCandidatoReq")
        .on("keypress", "#txtBuscarCandidatoReq", function (e) {
            if (e.which === 13) {
                e.preventDefault();
                buscarCandidatosReq();
            }
        });

    $(document)
        .off("click", ".btnAgregarCandidatoReq")
        .on("click", ".btnAgregarCandidatoReq", function () {
            const item = {
                TipoOrigen: $(this).data("tipo"),
                IdSolicitudOrigen: parseInt($(this).data("id"), 10),
                Folio: $(this).data("folio"),
                Nombre: $(this).data("nombre"),
                APaterno: $(this).data("paterno"),
                AMaterno: $(this).data("materno"),
                Puesto: $(this).data("puesto")
            };

            const yaExistePendiente = candidatosPendientesReq.some(x =>
                String(x.TipoOrigen) === String(item.TipoOrigen) &&
                String(x.IdSolicitudOrigen) === String(item.IdSolicitudOrigen)
            );

            if (yaExistePendiente) {
                mostrarMensajeBusquedaReq("warning", "Ese candidato ya fue agregado a la lista temporal.");
                return;
            }

            const yaExisteGuardado = candidatosGuardadosReq.some(x =>
                String(x.TipoOrigen) === String(item.TipoOrigen) &&
                String(x.IdSolicitudOrigen) === String(item.IdSolicitudOrigen)
            );

            if (yaExisteGuardado) {
                mostrarMensajeBusquedaReq("warning", "Ese candidato ya está guardado en la requisición.");
                return;
            }

            //if (candidatosPendientesReq.length >= reqModalState.restante) {
            //    mostrarMensajeBusquedaReq("warning", "Ya alcanzaste la cantidad restante disponible.");
            //    return;
            //}

            candidatosPendientesReq.push(item);
            renderTablaPendientesReq();
            renderResultadosBusquedaReq();
            actualizarResumenReqModal();
            mostrarMensajeBusquedaReq("success", `Folio #${item.Folio} agregado a pendientes.`);
        });

    $(document)
        .off("click", ".btnQuitarPendienteReq")
        .on("click", ".btnQuitarPendienteReq", function () {
            const index = parseInt($(this).data("index"), 10);
            candidatosPendientesReq.splice(index, 1);
            renderTablaPendientesReq();
            renderResultadosBusquedaReq();
            actualizarResumenReqModal();
        });

    $(document)
        .off("click", ".btnEliminarGuardadoReq")
        .on("click", ".btnEliminarGuardadoReq", function () {
            const idDetalle = parseInt($(this).data("iddetalle"), 10);
            const nombre = $(this).data("nombre") || "este candidato";

            Swal.fire({
                icon: "warning",
                title: "Eliminar candidato",
                text: `¿Deseas quitar a ${nombre} de esta requisición?`,
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-horario-popup swal-horario-popup-small',
                    confirmButton: 'swal-horario-confirm',
                    cancelButton: 'swal-horario-cancel'
                }
            }).then((result) => {
                if (!result.isConfirmed) return;

                $.post(window.appUrls.eliminarCandidatoRequisicion, {
                    idDetalle: idDetalle
                }, function (r) {
                    if (!r || !r.success) {
                        mostrarMensajeBusquedaReq("danger", (r && r.message) ? r.message : "No fue posible eliminar el candidato.");
                        return;
                    }

                    candidatosGuardadosReq = candidatosGuardadosReq.filter(x => parseInt(x.idDetalle, 10) !== idDetalle);

                    renderTablaGuardadosReq();
                    cargarCandidatosGuardadosReq(
                        reqModalState.idRequisicion,
                        reqModalState.idDetalleTurno
                    );
                    renderResultadosBusquedaReq();
                    cargarDashboardRequisiciones();

                    switchReqTab("guardados");
                    mostrarMensajeBusquedaReq("success", "Candidato eliminado correctamente.");
                }).fail(function () {
                    mostrarMensajeBusquedaReq("danger", "No fue posible eliminar el candidato.");
                });
            });
        });

    $(document)
        .off("click", "#btnGuardarCandidatosReq")
        .on("click", "#btnGuardarCandidatosReq", function () {
            const btn = $(this);

            if (!candidatosPendientesReq.length) {
                mostrarMensajeBusquedaReq("warning", "Debes agregar al menos un candidato.");
                return;
            }

            btn.prop("disabled", true).html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Guardando...');

            $.ajax({
                url: window.appUrls.agregarCandidatosRequisicion,
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({
                    idRequisicion: reqModalState.idRequisicion,
                    idDetalleTurno: reqModalState.idDetalleTurno,
                    IdTurno: reqModalState.idTurno,
                    Candidatos: candidatosPendientesReq
                })
            }).done(function (r) {
                if (!r || !r.success) {
                    mostrarMensajeBusquedaReq("danger", (r && r.message) ? r.message : "No se pudieron guardar los candidatos.");
                    return;
                }

                candidatosPendientesReq = [];
                renderTablaPendientesReq();
                cargarCandidatosGuardadosReq(
                    reqModalState.idRequisicion,
                    reqModalState.idDetalleTurno
                );
                renderResultadosBusquedaReq();
                cargarDashboardRequisiciones();
                actualizarResumenReqModal();
                mostrarMensajeBusquedaReq("success", "Los candidatos fueron guardados correctamente.");
            }).fail(function (xhr) {
                let msg = "No se pudieron guardar los candidatos.";
                if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                mostrarMensajeBusquedaReq("danger", msg);
            }).always(function () {
                btn.prop("disabled", false).html('<i class="fa-solid fa-floppy-disk me-1"></i> Guardar seleccionados');
            });
        });
}

function switchReqTab(tab) {
    reqModalState.activeTab = tab;

    $(".req-tab-btn").removeClass("active");
    $(`.req-tab-btn[data-tab="${tab}"]`).addClass("active");

    $(".req-tab-panel").removeClass("active");
    $(`.req-tab-panel[data-panel="${tab}"]`).addClass("active");
}

function buscarCandidatosReq() {
    const busqueda = ($("#txtBuscarCandidatoReq").val() || "").trim();

    if (!busqueda) {
        mostrarMensajeBusquedaReq("warning", "Debes escribir un criterio de búsqueda.");
        return;
    }

    mostrarMensajeBusquedaReq("info", "Buscando candidatos...", false);

    $("#boxResultadoBusquedaReq").html(`
        <div class="req-empty-box">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Consultando candidatos...</span>
        </div>
    `);

    $.post(window.appUrls.buscarCandidatosRequisicion, {
        Busqueda: busqueda
    }, function (r) {
        if (!r || !r.success || !r.items || !r.items.length) {
            resultadosBusquedaReq = [];

            $("#boxResultadoBusquedaReq").html(`
                <div class="req-empty-box">
                    <i class="fa-regular fa-face-frown-open"></i>
                    <span>No se encontraron candidatos.</span>
                </div>
            `);

            mostrarMensajeBusquedaReq("warning", (r && r.message) ? r.message : "No se encontraron candidatos.");
            return;
        }

        resultadosBusquedaReq = r.items || [];
        renderResultadosBusquedaReq();
        mostrarMensajeBusquedaReq("success", `Se encontraron ${r.items.length} resultado(s).`);
    }).fail(function (xhr) {
        resultadosBusquedaReq = [];

        const msg = (xhr && xhr.responseJSON && xhr.responseJSON.message)
            ? xhr.responseJSON.message
            : "No se pudo comunicar con el servidor.";

        $("#boxResultadoBusquedaReq").html(`
            <div class="req-empty-box">
                <i class="fa-regular fa-circle-xmark"></i>
                <span>${escapeHtml(msg)}</span>
            </div>
        `);

        mostrarMensajeBusquedaReq("danger", msg);
    });
}

function renderResultadosBusquedaReq() {
    const contenedor = $("#boxResultadoBusquedaReq");

    if (!contenedor.length) return;

    const resultadosFiltrados = (resultadosBusquedaReq || []).filter(item => {
        const existePendiente = candidatosPendientesReq.some(x =>
            String(x.TipoOrigen) === String(item.TipoOrigen) &&
            String(x.IdSolicitudOrigen) === String(item.IdSolicitudOrigen)
        );

        const existeGuardado = candidatosGuardadosReq.some(x =>
            String(x.TipoOrigen) === String(item.TipoOrigen) &&
            String(x.IdSolicitudOrigen) === String(item.IdSolicitudOrigen)
        );

        return !existePendiente && !existeGuardado;
    });

    if (!resultadosFiltrados.length) {
        contenedor.html(`
            <div class="req-empty-box">
                <i class="fa-regular fa-face-smile"></i>
                <span>No hay más candidatos disponibles en esta búsqueda.</span>
            </div>
        `);
        return;
    }

    let html = `
        <table class="app-table req-modal-table">
            <thead>
                <tr>
                    <th>Origen</th>
                    <th>Folio</th>
                    <th>Nombre</th>
                    <th>Puesto</th>
                    <th style="width:70px;">Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    resultadosFiltrados.forEach(item => {
        const nombreCompleto = `${item.Nombre || ""} ${item.APaterno || ""} ${item.AMaterno || ""}`.trim();
        const origenClass = String(item.TipoOrigen || "").toLowerCase() === "externa" ? "ext" : "int";

        html += `
            <tr>
                <td>
                    <span class="req-origin-badge ${origenClass}">
                        ${escapeHtml(item.TipoOrigen || "")}
                    </span>
                </td>
                <td>#${escapeHtml(item.Folio || "")}</td>
                <td>${escapeHtml(nombreCompleto)}</td>
                <td>${escapeHtml(item.Puesto || "")}</td>
                <td class="text-center">
                    <button type="button"
                            class="req-action-btn add btnAgregarCandidatoReq"
                            title="Agregar candidato"
                            data-tipo="${escapeAttr(item.TipoOrigen || "")}"
                            data-id="${escapeAttr(item.IdSolicitudOrigen)}"
                            data-folio="${escapeAttr(item.Folio || "")}"
                            data-nombre="${escapeAttr(item.Nombre || "")}"
                            data-paterno="${escapeAttr(item.APaterno || "")}"
                            data-materno="${escapeAttr(item.AMaterno || "")}"
                            data-puesto="${escapeAttr(item.Puesto || "")}">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.html(html);
}

function actualizarResumenReqModal() {
    const pendientes = candidatosPendientesReq.length;
    const guardados = candidatosGuardadosReq.length;

    $("#reqStatCantidadInicial").text(reqModalState.cantidadInicial);
    $("#reqStatRestante").text(reqModalState.restante);
    $("#reqStatAdquiridos").text(reqModalState.adquiridos);
    $("#reqStatPendientes").text(pendientes);

    $("#reqSelectedCounter").text(pendientes);
    $("#reqSavedCounter").text(guardados);
    $("#reqTabPendientesCounter").text(pendientes);
    $("#reqTabGuardadosCounter").text(guardados);

    const $tabPendientes = $('.req-tab-btn[data-tab="pendientes"]');
    const $tabGuardados = $('.req-tab-btn[data-tab="guardados"]');

    $tabPendientes.removeClass("has-items");
    $tabGuardados.removeClass("has-items");

    if (pendientes > 0) {
        $tabPendientes.addClass("has-items tab-pulse");
        setTimeout(() => {
            $tabPendientes.removeClass("tab-pulse");
        }, 450);
    }

    if (guardados > 0) {
        $tabGuardados.addClass("has-items tab-pulse");
        setTimeout(() => {
            $tabGuardados.removeClass("tab-pulse");
        }, 450);
    }
}

function cargarCandidatosGuardadosReq(idRequisicion, idDetalleTurno) {
    $.post(window.appUrls.consultarCandidatosRequisicion, {
        idRequisicion: idRequisicion,
        idDetalleTurno: idDetalleTurno || null
    }, function (r) {
        if (!r || !r.success) {
            candidatosGuardadosReq = [];
            reqModalState.adquiridos = 0;
            reqModalState.restante = reqModalState.cantidadInicial;
            renderTablaGuardadosReq();
            actualizarResumenReqModal();
            return;
        }

        candidatosGuardadosReq = r.items || [];

        const contratados = candidatosGuardadosReq.filter(x => {
            const estatus = parseInt(x.Estatus ?? x.estatus ?? 0, 10);
            return estatus === 3;
        }).length;

        reqModalState.adquiridos = contratados;
        reqModalState.restante = Math.max(0, reqModalState.cantidadInicial - contratados);

        renderTablaGuardadosReq();
        actualizarResumenReqModal();
    }).fail(function () {
        candidatosGuardadosReq = [];
        reqModalState.adquiridos = 0;
        reqModalState.restante = reqModalState.cantidadInicial;

        renderTablaGuardadosReq();
        actualizarResumenReqModal();
    });
}

function renderTablaPendientesReq() {
    const tbody = $("#tblPendientesReqBody");
    if (!tbody.length) return;

    tbody.html("");

    if (!candidatosPendientesReq.length) {
        tbody.html(`
            <tr>
                <td colspan="5" class="text-center">No hay candidatos agregados</td>
            </tr>
        `);
        actualizarResumenReqModal();
        return;
    }

    candidatosPendientesReq.forEach((item, index) => {
        const nombreCompleto = [
            item.Nombre || "",
            item.APaterno || "",
            item.AMaterno || ""
        ].join(" ").replace(/\s+/g, " ").trim();

        const origenClass = String(item.TipoOrigen || "").toLowerCase() === "externa" ? "ext" : "int";

        tbody.append(`
            <tr>
                <td>
                    <span class="req-origin-badge ${origenClass}">
                        ${escapeHtml(item.TipoOrigen || "")}
                    </span>
                </td>
                <td>#${escapeHtml(item.Folio || "")}</td>
                <td>${escapeHtml(nombreCompleto)}</td>
                <td>${escapeHtml(item.Puesto || "")}</td>
                <td class="text-center">
                    <button type="button"
                            class="req-action-btn remove btnQuitarPendienteReq"
                            data-index="${escapeAttr(index)}"
                            title="Quitar candidato">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    actualizarResumenReqModal();
}

function renderTablaGuardadosReq() {
    const tbody = $("#tblGuardadosReqBody");
    if (!tbody.length) return;

    tbody.html("");

    if (!candidatosGuardadosReq.length) {
        tbody.html(`
            <tr>
                <td colspan="5" class="text-center">No hay candidatos guardados</td>
            </tr>
        `);
        actualizarResumenReqModal();
        return;
    }

    candidatosGuardadosReq.forEach(item => {
        const origenClass = String(item.TipoOrigen || "").toLowerCase() === "externa" ? "ext" : "int";

        tbody.append(`
            <tr>
                <td>
                    <span class="req-origin-badge ${origenClass}">
                        ${escapeHtml(item.TipoOrigen || "")}
                    </span>
                </td>
                <td>#${escapeHtml(item.Folio || "")}</td>
                <td>${escapeHtml(item.NombreCompleto || "")}</td>
                <td>${escapeHtml(item.Puesto || "")}</td>
                <td class="text-center">
                    <button type="button"
                            class="req-action-btn remove btnEliminarGuardadoReq"
                            data-iddetalle="${escapeAttr(item.idDetalle)}"
                            data-nombre="${escapeAttr(item.NombreCompleto || "")}"
                            title="Eliminar guardado">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    actualizarResumenReqModal();
}

function mostrarMensajeBusquedaReq(tipo, mensaje, autoclose = true) {
    const map = {
        success: {
            cls: "req-alert-success",
            icon: "fa-circle-check"
        },
        warning: {
            cls: "req-alert-warning",
            icon: "fa-triangle-exclamation"
        },
        danger: {
            cls: "req-alert-danger",
            icon: "fa-circle-xmark"
        },
        info: {
            cls: "req-alert-info",
            icon: "fa-circle-info"
        }
    };

    const cfg = map[tipo] || map.info;
    const $box = $("#msgBusquedaReq");

    clearTimeout(window.reqAlertTimer);

    $box.stop(true, true).html(`
        <div class="req-alert ${cfg.cls}">
            <div class="req-alert-icon">
                <i class="fa-solid ${cfg.icon}"></i>
            </div>
            <div class="req-alert-text">${escapeHtml(mensaje)}</div>
        </div>
    `).addClass("show");

    if (autoclose) {
        window.reqAlertTimer = setTimeout(() => {
            $box.removeClass("show");
            setTimeout(() => {
                $box.html("");
            }, 180);
        }, 2200);
    }
}

function formatearFechaMvc(fecha) {
    if (!fecha) return "-";

    if (typeof fecha === "string") {
        const match = /\/Date\((\d+)\)\//.exec(fecha);
        if (match) {
            const date = new Date(parseInt(match[1], 10));
            return date.toLocaleDateString("es-MX");
        }

        const parsed = new Date(fecha);
        if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("es-MX");
        }
    }

    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.toLocaleDateString("es-MX");
    }

    return "-";
}

function bindDetalleRequisicionEvents() {
    $(document)
        .off("click", ".btnVerDetalleReq")
        .on("click", ".btnVerDetalleReq", function () {
            const idRequisicion = parseInt($(this).data("id"), 10);
            abrirDetalleRequisicion(idRequisicion);
        });

    $(document)
        .off("click", ".btnVerCandidatoTimeline")
        .on("click", ".btnVerCandidatoTimeline", function () {
            const btn = $(this);

            const origen = btn.data("origen") || "-";
            const idSolicitudOrigen = parseInt(btn.data("id-solicitud-origen"), 10) || 0;
            const folio = btn.data("folio") || "-";
            const nombre = btn.data("nombre") || "-";
            const puesto = btn.data("puesto") || "-";
            const fecha = btn.data("fecha") || "-";

            if (!window.appUrls || !window.appUrls.detalleCandidatoRequisicion) {
                Swal.fire({
                    icon: "warning",
                    title: "Ruta no configurada",
                    text: "Falta agregar window.appUrls.detalleCandidatoRequisicion en la vista.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-horario-popup swal-horario-popup-small',
                        confirmButton: 'swal-horario-confirm'
                    }
                });
                return;
            }

            Swal.fire({
                html: `
                    <div class="swal-candidato-wrap">
                        <div class="swal-candidato-loading">
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <span>Cargando información del candidato...</span>
                        </div>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    popup: 'swal-candidato-popup'
                }
            });

            $.ajax({
                url: window.appUrls.detalleCandidatoRequisicion,
                type: "POST",
                dataType: "json",
                data: {
                    tipoOrigen: origen,
                    idSolicitudOrigen: idSolicitudOrigen
                }
            }).done(function (r) {
                if (!r || !r.success) {
                    Swal.fire({
                        icon: "warning",
                        title: "No fue posible cargar el detalle",
                        text: r && r.message ? r.message : "No se encontró información del candidato.",
                        confirmButtonText: "Cerrar",
                        buttonsStyling: false,
                        customClass: {
                            popup: 'swal-horario-popup swal-horario-popup-small',
                            confirmButton: 'swal-horario-confirm'
                        }
                    });
                    return;
                }

                const item = r.item || {};

                mostrarDetalleCandidatoTimeline({
                    origen: item.TipoOrigen || origen,
                    folio: item.Folio || folio,
                    nombre: item.NombreCompleto || nombre,
                    puesto: item.Puesto || puesto,
                    fecha: item.FechaRegistroFmt || fecha,

                    // Interno
                    numeroEmpleado: item.Numero_Empleado || item.NumeroEmpleado || "-",
                    fechaIngreso: item.Fecha_IngresoFmt || item.FechaIngresoFmt || "-",
                    turno: item.Turno || "-",
                    nivelEducacion: item.Nivel_Educacion || "-",
                    experiencia: item.Experiencia || "-",
                    nivelIngles: item.Nivel_Ingles || "-",
                    habilidades: item.Habilidades || "-",
                    cursosCertificaciones: item.Cursos_Certificaciones || "-",
                    nivelEducacionActual: item.Nivel_Educacion_Actual || "-",

                    cv: item.CV || "",
                    cvUrl: item.CvUrl || item.CVUrl || "",
                    cvExtension: item.CvExtension || "",

                    // Externo
                    gradoEstudios: item.Grado_Estudios || "-",
                    estudiaActualmente: formatearSiNoEstudia(item.Estudia_Actualmente),
                    nombreInstitucion: item.Nombre_Institucion || "-",
                    nivelEstudios: item.Nivel_Estudios || "-",
                    carrera: item.Carrera || "-",
                    horarioClases: item.Horario_Clases || "-",
                    documentoAprobatorio: item.Documento_Aprobatorio || "-",
                    empleosHistorial: item.EmpleosHistorial || []
                });

            }).fail(function () {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo comunicar con el servidor.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-horario-popup swal-horario-popup-small',
                        confirmButton: 'swal-horario-confirm'
                    }
                });
            });
        });
}

function abrirDetalleRequisicion(idRequisicion) {
    $("#reqDetalleHeader").html(`
        <div class="req-empty-box">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Cargando detalle...</span>
        </div>
    `);

    $("#reqTimelineBody").html(`
        <div class="req-empty-box">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Cargando timeline...</span>
        </div>
    `);

    const modalEl = document.getElementById("modalDetalleRequisicion");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    $.get(window.appUrls.detalleRequisicion, { idRequisicion: idRequisicion }, function (r) {
        if (!r || !r.success) {
            $("#reqDetalleHeader").html(`
                <div class="req-empty-box">
                    <i class="fa-regular fa-circle-xmark"></i>
                    <span>No fue posible cargar el detalle.</span>
                </div>
            `);

            $("#reqTimelineBody").html("");
            return;
        }

        detalleRequisicionActual = r;
        renderDetalleRequisicionHeader(r.header);
        renderDetalleRequisicionTimeline(r.header, r.candidatos || []);
    }).fail(function () {
        $("#reqDetalleHeader").html(`
            <div class="req-empty-box">
                <i class="fa-regular fa-circle-xmark"></i>
                <span>No fue posible cargar el detalle.</span>
            </div>
        `);

        $("#reqTimelineBody").html("");
    });
}

function renderDetalleRequisicionHeader(header) {
    if (!header) {
        $("#reqDetalleHeader").html(`
            <div class="req-empty-box">
                <i class="fa-regular fa-circle-xmark"></i>
                <span>No hay información disponible.</span>
            </div>
        `);
        return;
    }

    const fecha = formatearFechaMvc(header.FechaRegistro);

    $("#reqDetalleHeader").html(`
        <div class="req-detail-stats">
            <div class="req-stat-card req-stat-card-main">
                <div class="req-stat-icon">
                    <i class="fa-solid fa-file-circle-check"></i>
                </div>
                <div class="req-stat-label">Requisición</div>
                <div class="req-stat-value">#${escapeHtml(header.idRequisicion || "-")}</div>
                <div class="req-stat-subvalue">${escapeHtml(header.PosicionDescripcion || header.Posicion || "-")}</div>
            </div>

            <div class="req-stat-card req-stat-card-date">
                <div class="req-stat-icon">
                    <i class="fa-regular fa-calendar-days"></i>
                </div>
                <div class="req-stat-label">Creada el</div>
                <div class="req-stat-value-sm">${escapeHtml(fecha)}</div>
            </div>

            <div class="req-stat-card req-stat-card-user">
                <div class="req-stat-icon">
                    <i class="fa-regular fa-user"></i>
                </div>
                <div class="req-stat-label">Creada por</div>
                <div class="req-stat-value-sm">${escapeHtml(header.Usuario_ || "Sin capturar")}</div>
            </div>

            <div class="req-stat-card req-stat-card-shift">
                <div class="req-stat-icon">
                    <i class="fa-regular fa-clock"></i>
                </div>
                <div class="req-stat-label">Turno</div>
                <div class="req-stat-value-sm">${escapeHtml(header.TurnoNombre || "-")}</div>
            </div>

            <div class="req-stat-card req-stat-card-category">
                <div class="req-stat-icon">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                <div class="req-stat-label">Categoría</div>
                <div class="req-stat-value-sm">${escapeHtml(header.Categoria || "-")}</div>
            </div>

            <div class="req-stat-card req-stat-card-type">
                <div class="req-stat-icon">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>
                <div class="req-stat-label">Tipo requisición</div>
                <div class="req-stat-value-sm">${escapeHtml(header.Tipo_Requisicion || "-")}</div>
            </div>
        </div>
    `);
}



function renderDetalleRequisicionTimeline(header, candidatos) {
    const listaCandidatos = ordenarCandidatosTimeline(candidatos || []);
    const turnos = obtenerTurnosTimeline(listaCandidatos);

    let html = "";

    const fechaCreacion = formatearFechaMvc(header?.FechaRegistro);

    html += `
        <div class="req-timeline-item req-timeline-item-primary">
            <div class="req-timeline-dot"><i class="fa-solid fa-file-circle-plus"></i></div>
            <div class="req-timeline-card">
                <div class="req-timeline-head">
                    <div class="req-timeline-event">Requisición creada</div>
                    <div class="req-timeline-date">${escapeHtml(fechaCreacion)}</div>
                </div>
                <div class="req-timeline-text">
                    La requisición <b>#${escapeHtml(header?.idRequisicion || "-")}</b> fue creada por
                    <b>${escapeHtml(header?.Usuario_ || "Sin capturar")}</b>.
                </div>
            </div>
        </div>
    `;

    if (!listaCandidatos.length) {
        html += `
            <div class="req-timeline-item">
                <div class="req-timeline-dot"><i class="fa-regular fa-clock"></i></div>
                <div class="req-timeline-card">
                    <div class="req-timeline-head">
                        <div class="req-timeline-event">Sin candidatos agregados</div>
                    </div>
                    <div class="req-timeline-text">
                        Aún no hay candidatos asignados a esta requisición.
                    </div>
                </div>
            </div>
        `;

        $("#reqTimelineBody").html(html);
        return;
    }

    if (turnos.length > 1) {
        html += generarTabsTimelineTurnos(turnos, listaCandidatos);
        html += `<div id="reqTimelineCandidatesContainer" class="req-timeline-candidates-container"></div>`;
        $("#reqTimelineBody").html(html);

        renderContenidoTimelineCandidatos(header, listaCandidatos, listaCandidatos);

        bindTabsTimelineTurnos();
        return;
    }

    html += generarContenidoTimelineCandidatos(header, listaCandidatos, listaCandidatos);
    $("#reqTimelineBody").html(html);
}


function obtenerTurnosTimeline(candidatos) {
    const map = {};

    (candidatos || []).forEach(item => {
        const idTurno = item.IdTurno || item.idTurno || "";
        const idDetalleTurno = item.idDetalleTurno || item.IdDetalleTurno || "";
        const turnoNombre = item.TurnoNombre || item.turnoNombre || "";

        if (!turnoNombre || !String(turnoNombre).trim()) return;

        const key = String(idDetalleTurno || idTurno || turnoNombre).trim();

        if (!map[key]) {
            map[key] = {
                key: key,
                idDetalleTurno: idDetalleTurno,
                idTurno: idTurno,
                nombre: turnoNombre,
                total: 0
            };
        }

        map[key].total++;
    });

    return Object.values(map);
}

function ordenarCandidatosTimeline(candidatos) {
    return (candidatos || []).slice().sort(function (a, b) {
        const idA = parseInt(a.idDetalle ?? a.IdDetalle ?? a.Id_Detalle ?? 0, 10) || 0;
        const idB = parseInt(b.idDetalle ?? b.IdDetalle ?? b.Id_Detalle ?? 0, 10) || 0;

        if (idA !== idB) {
            return idB - idA;
        }

        const fechaA = extraerFechaOrdenTimeline(a.FechaRegistro);
        const fechaB = extraerFechaOrdenTimeline(b.FechaRegistro);

        if (fechaA !== fechaB) {
            return fechaB - fechaA;
        }

        const folioA = parseInt(a.Folio ?? a.folio ?? 0, 10) || 0;
        const folioB = parseInt(b.Folio ?? b.folio ?? 0, 10) || 0;

        return folioB - folioA;
    });
}

function extraerFechaOrdenTimeline(fecha) {
    if (!fecha) return 0;

    if (typeof fecha === "string") {
        const match = /\/Date\((\d+)\)\//.exec(fecha);

        if (match) {
            return parseInt(match[1], 10) || 0;
        }

        const parsed = new Date(fecha);

        if (!isNaN(parsed.getTime())) {
            return parsed.getTime();
        }
    }

    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.getTime();
    }

    return 0;
}



function generarTabsTimelineTurnos(turnos, candidatos) {
    const total = (candidatos || []).length;

    let html = `
        <div class="req-timeline-tabs-wrap">
            <div class="req-timeline-tabs-title">
                <i class="fa-regular fa-folder-open"></i>
                Filtrar timeline por turno
            </div>

            <div class="req-timeline-tabs">
                <button type="button"
                        class="req-timeline-tab active"
                        data-turno-key="todos">
                    <i class="fa-solid fa-layer-group"></i>
                    <span>Todos</span>
                    <b>${escapeHtml(total)}</b>
                </button>
    `;

    turnos.forEach(turno => {
        html += `
            <button type="button"
                    class="req-timeline-tab"
                    data-turno-key="${escapeAttr(turno.key)}">
                <i class="fa-regular fa-clock"></i>
                <span>${escapeHtml(turno.nombre)}</span>
                <b>${escapeHtml(turno.total)}</b>
            </button>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

function bindTabsTimelineTurnos() {
    $(document)
        .off("click", ".req-timeline-tab")
        .on("click", ".req-timeline-tab", function () {
            const btn = $(this);
            const key = String(btn.data("turno-key") || "todos");

            $(".req-timeline-tab").removeClass("active");
            btn.addClass("active");

            if (!detalleRequisicionActual) return;

            const header = detalleRequisicionActual.header || {};
            const candidatos = ordenarCandidatosTimeline(detalleRequisicionActual.candidatos || []);
            let filtrados = candidatos;

            if (key !== "todos") {
                filtrados = candidatos.filter(item => {
                    const idTurno = item.IdTurno || item.idTurno || "";
                    const idDetalleTurno = item.idDetalleTurno || item.IdDetalleTurno || "";
                    const turnoNombre = item.TurnoNombre || item.turnoNombre || "";
                    const itemKey = String(idDetalleTurno || idTurno || turnoNombre).trim();

                    return itemKey === key;
                });
            }

            renderContenidoTimelineCandidatos(
                header,
                ordenarCandidatosTimeline(filtrados),
                candidatos
            );
        });
}

function renderContenidoTimelineCandidatos(header, candidatosFiltrados, candidatosTodos) {
    const html = generarContenidoTimelineCandidatos(header, candidatosFiltrados, candidatosTodos);
    $("#reqTimelineCandidatesContainer").html(html);
}

    function generarContenidoTimelineCandidatos(header, candidatosFiltrados, candidatosTodos) {
        candidatosFiltrados = ordenarCandidatosTimeline(candidatosFiltrados || []);
        candidatosTodos = ordenarCandidatosTimeline(candidatosTodos || []);

        let html = "";

    const cantidadSolicitada = parseInt(header?.Cantidad ?? header?.cantidad ?? 0, 10) || 0;

    const contratadosActuales = (candidatosTodos || []).filter(x => {
        const estatus = parseInt(x.Estatus ?? x.estatus ?? 0, 10);
        return estatus === 3;
    }).length;

    const requisicionLlena = cantidadSolicitada > 0 && contratadosActuales >= cantidadSolicitada;

    if (!candidatosFiltrados || !candidatosFiltrados.length) {
        return `
            <div class="req-timeline-item">
                <div class="req-timeline-dot"><i class="fa-regular fa-folder-open"></i></div>
                <div class="req-timeline-card">
                    <div class="req-timeline-head">
                        <div class="req-timeline-event">Sin candidatos en este turno</div>
                    </div>
                    <div class="req-timeline-text">
                        No hay candidatos asignados al turno seleccionado.
                    </div>
                </div>
            </div>
        `;
    }

    candidatosFiltrados.forEach(item => {
        const fecha = formatearFechaMvc(item.FechaRegistro);
        const origenClass = String(item.TipoOrigen || "").toLowerCase() === "externa" ? "ext" : "int";
        const turnoNombreCandidato = item.TurnoNombre || item.turnoNombre || "";
        const tieneTurnoAsignado = turnoNombreCandidato && String(turnoNombreCandidato).trim() !== "";

        const idSolicitudOrigen =
            item.IdSolicitudOrigen ||
            item.idSolicitudOrigen ||
            item.IdSolicitud ||
            item.Id_Vacante ||
            item.IdVacante ||
            0;

        const idDetalle = item.idDetalle || item.IdDetalle || item.Id_Detalle || 0;
        const estatusCandidato = item.Estatus ?? item.estatus ?? null;
        const estatusValor = parseInt(estatusCandidato, 10) || 0;
        const comentarioEstatus = item.Comentario_Estatus || item.comentario_Estatus || item.ComentarioEstatus || "";
        const estatusHtml = generarBadgeEstatusCandidato(estatusCandidato);

        const checklist = normalizarChecklistCandidato(item);

        const puedeEditarChecklistSeguimiento =
            window.userPermissions &&
            window.userPermissions.puedeEditarChecklistSeguimiento === true;

        const checklistResumenHtml = generarResumenChecklistCandidato(
            checklist,
            idDetalle,
            puedeEditarChecklistSeguimiento
        );

        const candidatoContratado = estatusValor === 3;

        const puedeGestionarCandidato = !requisicionLlena && !candidatoContratado;

        const mostrarBotonEstatus = puedeGestionarCandidato;

        const puedeConfigurarChecklist =
            window.userPermissions &&
            window.userPermissions.puedeConfigurarChecklist === true;

        const mostrarBotonChecklist =
            puedeConfigurarChecklist && puedeGestionarCandidato && estatusValor === 1;

        const mostrarBotonContratar = puedeGestionarCandidato && estatusValor === 1;

        const mostrarResumenChecklist = puedeGestionarCandidato && estatusValor === 1;

        html += `
            <div class="req-timeline-item">
                <div class="req-timeline-dot"><i class="fa-solid fa-user-plus"></i></div>
                <div class="req-timeline-card">
                    <div class="req-timeline-head req-timeline-head-candidato">
                        <div class="req-timeline-event">
                            <div class="req-timeline-name">
                                ${escapeHtml(item.NombreCompleto || "-")}
                                <span class="req-timeline-folio">#${escapeHtml(item.Folio || "-")}</span>
                            </div>

                            <div class="req-timeline-status">
                                ${estatusHtml}
                            </div>
                        </div>

                        <div class="req-timeline-actions req-timeline-actions-top">
                            <button type="button"
                                    class="req-action-btn add btnVerCandidatoTimeline"
                                    data-origen="${escapeAttr(item.TipoOrigen || "")}"
                                    data-id-solicitud-origen="${escapeAttr(idSolicitudOrigen)}"
                                    data-folio="${escapeAttr(item.Folio || "")}"
                                    data-nombre="${escapeAttr(item.NombreCompleto || "")}"
                                    data-puesto="${escapeAttr(item.Puesto || "")}"
                                    data-fecha="${escapeAttr(fecha)}"
                                    title="Ver detalle del candidato">
                                <i class="fa-regular fa-eye"></i>
                            </button>

                            ${mostrarBotonEstatus ? `
                                <button type="button"
                                        class="req-action-btn status btnCambiarEstatusCandidato"
                                        data-iddetalle="${escapeAttr(idDetalle)}"
                                        data-nombre="${escapeAttr(item.NombreCompleto || "")}"
                                        data-estatus="${escapeAttr(estatusCandidato || "")}"
                                        data-comentario="${escapeAttr(comentarioEstatus)}"
                                        title="Aceptar o rechazar candidato">
                                    <i class="fa-solid fa-user-check"></i>
                                </button>
                            ` : ""}

                            ${mostrarBotonChecklist ? `
                                <button type="button"
                                        class="req-action-btn checklist btnChecklistCandidato"
                                        data-iddetalle="${escapeAttr(idDetalle)}"
                                        data-nombre="${escapeAttr(item.NombreCompleto || "")}"
                                        data-descriptivo-puesto="${escapeAttr(checklist.descriptivoPuesto.requerido ? "1" : "0")}"
                                        data-examen-medico="${escapeAttr(checklist.examenMedico.requerido ? "1" : "0")}"
                                        data-estudios-medicos="${escapeAttr(checklist.estudiosMedicos.requerido ? "1" : "0")}"
                                        data-estudio-socioeconomico="${escapeAttr(checklist.estudioSocioeconomico.requerido ? "1" : "0")}"
                                        data-carta-no-antecedentes="${escapeAttr(checklist.cartaNoAntecedentes.requerido ? "1" : "0")}"
                                        data-evaluacion-liderazgo-disk="${escapeAttr(checklist.evaluacionLiderazgoDisk.requerido ? "1" : "0")}"
                                        data-carta-oferta-aprobacion-gm="${escapeAttr(checklist.cartaOfertaAprobacionGM.requerido ? "1" : "0")}"
                                        data-evaluacion-supervisor="${escapeAttr(checklist.evaluacionSupervisor.requerido ? "1" : "0")}"
                                        title="Checklist del candidato">
                                    <i class="fa-solid fa-list-check"></i>
                                </button>
                            ` : ""}

                            ${mostrarBotonContratar ? `
                                <button type="button"
                                        class="req-action-btn hire btnContratarCandidato"
                                        data-iddetalle="${escapeAttr(idDetalle)}"
                                        data-nombre="${escapeAttr(item.NombreCompleto || "")}"
                                        title="Contratar candidato">
                                    <i class="fa-solid fa-handshake"></i>
                                </button>
                            ` : ""}
                        </div>
                    </div>

                    <div class="req-timeline-candidate">
                        ${mostrarResumenChecklist ? checklistResumenHtml : ""}

                        <div class="req-timeline-footer-row">
                            <div class="req-timeline-date-footer">
                                <span class="req-origin-badge ${origenClass}">
                                    ${escapeHtml(item.TipoOrigen || "")}
                                </span>

                                ${tieneTurnoAsignado ? `
                                    <span class="req-turno-badge-timeline">
                                        <i class="fa-regular fa-clock"></i>
                                        Turno: ${escapeHtml(turnoNombreCandidato)}
                                    </span>
                                ` : ""}
                            </div>

                            <div class="req-timeline-origin-footer">
                                <span class="req-timeline-date-badge">
                                    Fecha:
                                    ${escapeHtml(fecha)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    return html;
}


function mostrarDetalleCandidatoTimeline(item) {
    const origenTexto = String(item.origen || "").toLowerCase();
    const origenClass = origenTexto === "externa" ? "ext" : "int";
    const esInterna = origenTexto === "interna";
    const esExterna = origenTexto === "externa";

    const bloqueExtra = esInterna
        ? generarBloqueInternoCandidato(item)
        : generarBloqueExternoCandidato(item);

    const bloqueCv = esInterna
        ? generarBloqueCvCandidato(item)
        : "";

    Swal.fire({
        html: `
            <div class="swal-candidato-wrap">
                <div class="swal-candidato-head">
                    <div class="swal-candidato-head-icon">
                      <i class="fa-solid fa-briefcase"></i>
                    </div>

                    <div class="swal-candidato-head-text">
                        <div class="swal-candidato-kicker">Detalle del candidato ${escapeHtml(item.origen)}</div>
                        <h3 class="swal-candidato-title">${escapeHtml(item.nombre)}</h3>
                        <div class="swal-candidato-sub">#${escapeHtml(item.folio)}</div>
                    </div>
                </div>

                <div class="swal-candidato-body">
                   
                    ${bloqueExtra}
                    ${bloqueCv}
                </div>
            </div>
        `,
        width: esExterna ? 980 : 920,
        confirmButtonText: 'Cerrar',
        buttonsStyling: false,
        customClass: {
            popup: 'swal-candidato-popup swal-candidato-popup-wide',
            confirmButton: 'swal-candidato-confirm'
        }
    });
}

function generarBloqueCvCandidato(item) {
    const cv = item.cv || "";
    const cvUrl = item.cvUrl || "";
    const extension = String(item.cvExtension || "").toLowerCase();

    if (!cv || !cvUrl) {
        return `
            <div class="swal-candidato-cv-empty">
                <i class="fa-regular fa-file-circle-xmark"></i>
                <span>Este candidato no tiene CV capturado.</span>
            </div>
        `;
    }

    let preview = "";

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        preview = `
            <div class="swal-candidato-cv-preview">
                <img src="${escapeAttr(cvUrl)}" alt="Curriculum" />
            </div>
        `;
    } else if (extension === "pdf") {
        preview = `
            <div class="swal-candidato-cv-preview">
                <embed src="${escapeAttr(cvUrl)}" type="application/pdf" width="100%" height="430px" />
            </div>
        `;
    } else {
        preview = `
            <div class="swal-candidato-cv-empty">
                <i class="fa-regular fa-file-word"></i>
                <span>Vista previa no disponible para este tipo de archivo.</span>
            </div>
        `;
    }

    return `
        <div class="swal-candidato-cv-section">
            <div class="swal-candidato-cv-head">
                <div>
                    <div class="swal-candidato-cv-title">
                        <i class="fa-solid fa-file-invoice"></i>
                        Curriculum
                    </div>
                    <div class="swal-candidato-cv-name">${escapeHtml(cv)}</div>
                </div>

                <a class="swal-candidato-cv-btn" href="${escapeAttr(cvUrl)}" target="_blank" rel="noopener">
                    <i class="fa-solid fa-up-right-from-square"></i>
                    Abrir CV
                </a>
            </div>

            ${preview}
        </div>
    `;
}

function generarBloqueInternoCandidato(item) {
    return `
        <div class="swal-candidato-section">
            <div class="swal-candidato-section-title">
                <i class="fa-solid fa-building-user"></i>
                Información interna
            </div>

            <div class="swal-candidato-grid">
                <div class="swal-candidato-item">
                    <label>No. empleado</label>
                    <span>${escapeHtml(item.numeroEmpleado || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Fecha ingreso</label>
                    <span>${escapeHtml(item.fechaIngreso || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Turno</label>
                    <span>${escapeHtml(item.turno || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Nivel educación</label>
                    <span>${escapeHtml(item.nivelEducacion || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Nivel educación actual</label>
                    <span>${escapeHtml(item.nivelEducacionActual || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Nivel inglés</label>
                    <span>${escapeHtml(item.nivelIngles || "-")}</span>
                </div>

                <div class="swal-candidato-item full">
                    <label>Experiencia</label>
                    <span>${escapeHtml(item.experiencia || "-")}</span>
                </div>

                <div class="swal-candidato-item full">
                    <label>Habilidades</label>
                    <span>${escapeHtml(item.habilidades || "-")}</span>
                </div>

                <div class="swal-candidato-item full">
                    <label>Cursos / certificaciones</label>
                    <span>${escapeHtml(item.cursosCertificaciones || "-")}</span>
                </div>
            </div>
        </div>
    `;
}

function generarBloqueExternoCandidato(item) {
    const empleos = item.empleosHistorial || [];

    const estudiaTexto = String(item.estudiaActualmente || "").trim().toLowerCase();
    const estudiaActualmente = estudiaTexto === "sí" || estudiaTexto === "si" || estudiaTexto === "1";
    const mostrarDatosEscolaresActuales = estudiaActualmente;

    let camposEscolaresActualesHtml = "";

    if (mostrarDatosEscolaresActuales) {
        camposEscolaresActualesHtml = `
            <div class="swal-candidato-item full">
                <label>Institución</label>
                <span>${escapeHtml(item.nombreInstitucion || "-")}</span>
            </div>

            <div class="swal-candidato-item">
                <label>Nivel estudios</label>
                <span>${escapeHtml(item.nivelEstudios || "-")}</span>
            </div>

            <div class="swal-candidato-item">
                <label>Carrera</label>
                <span>${escapeHtml(item.carrera || "-")}</span>
            </div>

            <div class="swal-candidato-item">
                <label>Horario clases</label>
                <span>${escapeHtml(item.horarioClases || "-")}</span>
            </div>

            <div class="swal-candidato-item">
                <label>Documento aprobatorio</label>
                <span>${escapeHtml(item.documentoAprobatorio || "-")}</span>
            </div>
        `;
    }

    let empleosHtml = "";

    if (!empleos.length) {
        empleosHtml = `
            <div class="swal-candidato-empty-mini">
                <i class="fa-regular fa-folder-open"></i>
                <span>No tiene historial laboral capturado.</span>
            </div>
        `;
    } else {
        empleosHtml = `
            <div class="swal-empleos-list swal-empleos-grid-scroll">
        `;

        empleos.forEach((emp, index) => {
            empleosHtml += `
                <div class="swal-empleo-card">
                    <div class="swal-empleo-top">
                        <div class="swal-empleo-index">${index + 1}</div>
                        <div>
                            <div class="swal-empleo-empresa">${escapeHtml(emp.Empresa || "-")}</div>
                            <div class="swal-empleo-puesto">${escapeHtml(emp.Puesto || "-")}</div>
                        </div>
                    </div>

                    <div class="swal-empleo-grid">
                        <div>
                            <label>Duración</label>
                            <span>${escapeHtml(emp.Duracion || "-")}</span>
                        </div>

                        <div>
                            <label>Sueldo semanal</label>
                            <span>${escapeHtml(emp.SueldoSemanal || "-")}</span>
                        </div>

                        <div class="full">
                            <label>Motivo de salida</label>
                            <span>${escapeHtml(emp.Motivo || "-")}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        empleosHtml += `</div>`;
    }

    return `
        <div class="swal-candidato-section">
            <div class="swal-candidato-section-title">
                <i class="fa-solid fa-graduation-cap"></i>
                Información escolar
            </div>

            <div class="swal-candidato-grid">
                <div class="swal-candidato-item">
                    <label>Grado estudios</label>
                    <span>${escapeHtml(item.gradoEstudios || "-")}</span>
                </div>

                <div class="swal-candidato-item">
                    <label>Estudia actualmente</label>
                    <span>${escapeHtml(item.estudiaActualmente || "-")}</span>
                </div>

                ${camposEscolaresActualesHtml}
            </div>
        </div>

        <div class="swal-candidato-section">
            <div class="swal-candidato-section-title">
                <i class="fa-solid fa-briefcase"></i>
                Historial laboral
            </div>

            ${empleosHtml}
        </div>
    `;
}

//function generarBadgeEstatusCandidato(estatus) {
//    const valor = parseInt(estatus, 10);

//    if (valor === 1) {
//        return `
//            <span class="req-status-badge accepted">
//                <i class="fa-solid fa-circle-check"></i>
//                Aceptado
//            </span>
//        `;
//    }

//    if (valor === 2) {
//        return `
//            <span class="req-status-badge rejected">
//                <i class="fa-solid fa-circle-xmark"></i>
//                Rechazado
//            </span>
//        `;
//    }

//    return `
//        <span class="req-status-badge pending">
//            <i class="fa-regular fa-clock"></i>
//            Sin decisión
//        </span>
//    `;
//}

function generarBadgeEstatusCandidato(estatus) {
    const valor = parseInt(estatus, 10);

    if (valor === 1) {
        return `
            <span class="req-status-badge accepted">
                <i class="fa-solid fa-circle-check"></i>
                Aceptado
            </span>
        `;
    }

    if (valor === 2) {
        return `
            <span class="req-status-badge rejected">
                <i class="fa-solid fa-circle-xmark"></i>
                Rechazado
            </span>
        `;
    }

    if (valor === 3) {
        return `
            <span class="req-status-badge hired">
                <i class="fa-solid fa-id-badge"></i>
                Contratado
            </span>
        `;
    }

    return `
        <span class="req-status-badge pending">
            <i class="fa-regular fa-clock"></i>
            Sin decisión
        </span>
    `;
}

function textoEstatusCandidato(estatus) {
    const valor = parseInt(estatus, 10);

    if (valor === 1) return "Aceptado";
    if (valor === 2) return "Rechazado";
    if (valor === 3) return "Contratado";

    return "Sin decisión";
}

function bindCambiarEstatusCandidatoEvents() {
    $(document)
        .off("click", ".btnCambiarEstatusCandidato")
        .on("click", ".btnCambiarEstatusCandidato", function () {
            const btn = $(this);

            const idDetalle = parseInt(btn.data("iddetalle"), 10) || 0;
            const nombre = btn.data("nombre") || "este candidato";
            const estatusActual = btn.data("estatus") || "";
            const comentarioActual = btn.data("comentario") || "";

            if (idDetalle <= 0) {
                Swal.fire({
                    icon: "warning",
                    title: "No se puede actualizar",
                    text: "No se encontró el identificador del detalle del candidato.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-horario-popup swal-horario-popup-small',
                        confirmButton: 'swal-horario-confirm'
                    }
                });
                return;
            }

            pausarFocusTrapDetalleRequisicion();

            Swal.fire({
                html: `
                    <div class="swal-status-wrap">
                        <div class="swal-status-head">
                            <div class="swal-status-icon">
                                <i class="fa-solid fa-user-check"></i>
                            </div>

                            <div>
                                <div class="swal-status-kicker">Estatus del candidato</div>
                                <h3 class="swal-status-title">${escapeHtml(nombre)}</h3>
                                <div class="swal-status-sub">
                                    Estatus actual: <b>${escapeHtml(textoEstatusCandidato(estatusActual))}</b>
                                </div>
                            </div>
                        </div>

                        <div class="swal-status-options">
                            <button type="button" class="swal-status-card accepted" data-status-option="1">
                                <div class="swal-status-card-icon">
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div>
                                    <div class="swal-status-card-title">Aceptar</div>
                                    <div class="swal-status-card-text">Marcar candidato como aceptado</div>
                                </div>
                            </button>

                            <button type="button" class="swal-status-card rejected" data-status-option="2">
                                <div class="swal-status-card-icon">
                                    <i class="fa-solid fa-circle-xmark"></i>
                                </div>
                                <div>
                                    <div class="swal-status-card-title">Rechazar</div>
                                    <div class="swal-status-card-text">Marcar candidato como rechazado</div>
                                </div>
                            </button>
                        </div>

                        <div class="swal-status-comment">
                            <label for="txtComentarioEstatusCandidato">Comentario opcional</label>
                            <textarea id="txtComentarioEstatusCandidato"
                                      class="swal-status-textarea"
                                      rows="4"
                                      placeholder="Escribe un comentario si lo necesitas...">${escapeHtml(comentarioActual)}</textarea>
                        </div>

                        <input type="hidden" id="hdnEstatusCandidatoSeleccionado" value="${escapeAttr(estatusActual)}" />
                    </div>
                `,
                width: 720,
                showCancelButton: true,
                confirmButtonText: "Guardar estatus",
                cancelButtonText: "Cancelar",
                buttonsStyling: false,
                focusConfirm: false,
                focusCancel: false,
                allowEnterKey: false,
                returnFocus: false,
                customClass: {
                    popup: 'swal-status-popup',
                    confirmButton: 'swal-status-confirm',
                    cancelButton: 'swal-status-cancel'
                },
                didOpen: (popup) => {
                    const actual = String(estatusActual || "");

                    if (actual) {
                        $(popup)
                            .find(`.swal-status-card[data-status-option="${actual}"]`)
                            .addClass("selected");
                    }

                    $(popup)
                        .find(".swal-status-card")
                        .off("click")
                        .on("click", function () {
                            $(popup).find(".swal-status-card").removeClass("selected");
                            $(this).addClass("selected");

                            const selected = $(this).data("status-option");
                            $(popup).find("#hdnEstatusCandidatoSeleccionado").val(selected);
                        });

                    setTimeout(() => {
                        const textarea = popup.querySelector("#txtComentarioEstatusCandidato");

                        if (textarea) {
                            textarea.removeAttribute("readonly");
                            textarea.removeAttribute("disabled");
                            textarea.style.pointerEvents = "auto";
                        }
                    }, 80);
                },
                willClose: () => {
                    reactivarFocusTrapDetalleRequisicion();
                },
                preConfirm: () => {
                    const estatus = parseInt($("#hdnEstatusCandidatoSeleccionado").val(), 10) || 0;
                    const comentario = ($("#txtComentarioEstatusCandidato").val() || "").trim();

                    if (estatus !== 1 && estatus !== 2) {
                        Swal.showValidationMessage("Selecciona si deseas aceptar o rechazar al candidato.");
                        return false;
                    }

                    return {
                        estatus: estatus,
                        comentario: comentario
                    };
                }
            }).then((result) => {
                if (!result.isConfirmed || !result.value) return;

                guardarEstatusCandidatoRequisicion(
                    idDetalle,
                    result.value.estatus,
                    result.value.comentario
                );
            });
        });
}

function guardarEstatusCandidatoRequisicion(idDetalle, estatus, comentario) {
    if (!window.appUrls || !window.appUrls.actualizarEstatusCandidatoRequisicion) {
        Swal.fire({
            icon: "warning",
            title: "Ruta no configurada",
            text: "Falta agregar window.appUrls.actualizarEstatusCandidatoRequisicion en la vista.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
        return;
    }

    Swal.fire({
        html: `
            <div class="swal-candidato-wrap">
                <div class="swal-candidato-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Guardando estatus...</span>
                </div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
            popup: 'swal-candidato-popup'
        }
    });

    $.ajax({
        url: window.appUrls.actualizarEstatusCandidatoRequisicion,
        type: "POST",
        dataType: "json",
        data: {
            idDetalle: idDetalle,
            estatus: estatus,
            comentario: comentario
        }
    }).done(function (r) {
        if (!r || !r.success) {
            Swal.fire({
                icon: "warning",
                title: "No se pudo actualizar",
                text: r && r.message ? r.message : "No fue posible actualizar el estatus.",
                confirmButtonText: "Cerrar",
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-horario-popup swal-horario-popup-small',
                    confirmButton: 'swal-horario-confirm'
                }
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Estatus actualizado",
            text: r.message || "El estatus fue actualizado correctamente.",
            timer: 1400,
            showConfirmButton: false
        });

        if (detalleRequisicionActual && detalleRequisicionActual.header) {
            abrirDetalleRequisicion(detalleRequisicionActual.header.idRequisicion);
        } else {
            cargarDashboardRequisiciones();
        }

    }).fail(function () {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo comunicar con el servidor.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
    });
}

function formatearSiNoEstudia(valor) {
    const v = String(valor ?? "").trim().toLowerCase();

    if (v === "1") return "Sí";
    if (v === "2") return "No";

    if (v === "si" || v === "sí") return "Sí";
    if (v === "no") return "No";

    return valor || "-";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function pausarFocusTrapDetalleRequisicion() {
    const modalEl = document.getElementById("modalDetalleRequisicion");
    if (!modalEl || !window.bootstrap) return;

    const modalInstance = bootstrap.Modal.getInstance(modalEl);

    if (
        modalInstance &&
        modalInstance._focustrap &&
        typeof modalInstance._focustrap.deactivate === "function"
    ) {
        modalInstance._focustrap.deactivate();
    }
}

function reactivarFocusTrapDetalleRequisicion() {
    const modalEl = document.getElementById("modalDetalleRequisicion");
    if (!modalEl || !window.bootstrap) return;

    const modalInstance = bootstrap.Modal.getInstance(modalEl);

    if (
        modalInstance &&
        modalInstance._focustrap &&
        typeof modalInstance._focustrap.activate === "function" &&
        $(modalEl).hasClass("show")
    ) {
        modalInstance._focustrap.activate();
    }
}


function normalizarBoolChecklist(valor) {
    if (valor === true) return true;
    if (valor === false) return false;

    const v = String(valor ?? "").trim().toLowerCase();

    return v === "1" || v === "true" || v === "sí" || v === "si";
}

function normalizarChecklistCandidato(item) {
    return {
        descriptivoPuesto: {
            requerido: normalizarBoolChecklist(item.Checklist_DescriptivoPuesto),
            completado: normalizarBoolChecklist(item.ChecklistOK_DescriptivoPuesto)
        },
        examenMedico: {
            requerido: normalizarBoolChecklist(item.Checklist_ExamenMedico),
            completado: normalizarBoolChecklist(item.ChecklistOK_ExamenMedico)
        },
        estudiosMedicos: {
            requerido: normalizarBoolChecklist(item.Checklist_EstudiosMedicos),
            completado: normalizarBoolChecklist(item.ChecklistOK_EstudiosMedicos)
        },
        estudioSocioeconomico: {
            requerido: normalizarBoolChecklist(item.Checklist_EstudioSocioeconomico),
            completado: normalizarBoolChecklist(item.ChecklistOK_EstudioSocioeconomico)
        },
        cartaNoAntecedentes: {
            requerido: normalizarBoolChecklist(item.Checklist_CartaNoAntecedentes),
            completado: normalizarBoolChecklist(item.ChecklistOK_CartaNoAntecedentes)
        },
        evaluacionLiderazgoDisk: {
            requerido: normalizarBoolChecklist(item.Checklist_EvaluacionLiderazgoDisk),
            completado: normalizarBoolChecklist(item.ChecklistOK_EvaluacionLiderazgoDisk)
        },
        cartaOfertaAprobacionGM: {
            requerido: normalizarBoolChecklist(item.Checklist_CartaOfertaAprobacionGM),
            completado: normalizarBoolChecklist(item.ChecklistOK_CartaOfertaAprobacionGM)
        },
        evaluacionSupervisor: {
            requerido: normalizarBoolChecklist(item.Checklist_EvaluacionSupervisor),
            completado: normalizarBoolChecklist(item.ChecklistOK_EvaluacionSupervisor)
        }
    };
}

function getChecklistItemsCandidato(checklist) {
    checklist = checklist || {};

    return [
        {
            key: "descriptivoPuesto",
            label: "Descriptivo puesto",
            icon: "fa-file-lines",
            requerido: checklist.descriptivoPuesto?.requerido === true,
            completado: checklist.descriptivoPuesto?.completado === true
        },
        {
            key: "examenMedico",
            label: "Examen médico",
            icon: "fa-user-doctor",
            requerido: checklist.examenMedico?.requerido === true,
            completado: checklist.examenMedico?.completado === true
        },
        {
            key: "estudiosMedicos",
            label: "Estudios médicos",
            icon: "fa-x-ray",
            requerido: checklist.estudiosMedicos?.requerido === true,
            completado: checklist.estudiosMedicos?.completado === true
        },
        {
            key: "estudioSocioeconomico",
            label: "Estudio socioeconómico",
            icon: "fa-house-user",
            requerido: checklist.estudioSocioeconomico?.requerido === true,
            completado: checklist.estudioSocioeconomico?.completado === true
        },
        {
            key: "cartaNoAntecedentes",
            label: "Carta no antecedentes",
            icon: "fa-shield-halved",
            requerido: checklist.cartaNoAntecedentes?.requerido === true,
            completado: checklist.cartaNoAntecedentes?.completado === true
        },
        {
            key: "evaluacionLiderazgoDisk",
            label: "Liderazgo / DISK",
            icon: "fa-chart-simple",
            requerido: checklist.evaluacionLiderazgoDisk?.requerido === true,
            completado: checklist.evaluacionLiderazgoDisk?.completado === true
        },
        {
            key: "cartaOfertaAprobacionGM",
            label: "Carta oferta / GM",
            icon: "fa-file-signature",
            requerido: checklist.cartaOfertaAprobacionGM?.requerido === true,
            completado: checklist.cartaOfertaAprobacionGM?.completado === true
        },
        {
            key: "evaluacionSupervisor",
            label: "Evaluación Supervisor",
            icon: "fa-user-tie",
            requerido: checklist.evaluacionSupervisor?.requerido === true,
            completado: checklist.evaluacionSupervisor?.completado === true
        }
    ];
}

function generarResumenChecklistCandidato(checklist, idDetalle, puedeEditarSeguimiento) {
    const items = getChecklistItemsCandidato(checklist).filter(x => x.requerido);

    if (!items.length) {
        return "";
    }

    let html = `
        <div class="req-checklist-mini-grid req-checklist-mini-grid-compact">
    `;

    items.forEach(item => {
        html += `
            <button type="button"
                    class="req-checklist-mini-card ${item.completado ? "ok" : "missing"} ${puedeEditarSeguimiento ? "btnChecklistSeguimientoItem" : "readonly"}"
                    data-iddetalle="${escapeAttr(idDetalle)}"
                    data-campo="${escapeAttr(item.key)}"
                    data-completado="${escapeAttr(item.completado ? "1" : "0")}"
                    title="${escapeAttr(item.label)}">
                <div class="req-checklist-mini-icon">
                    <i class="fa-solid ${item.icon}"></i>
                </div>

                <div class="req-checklist-mini-text">
                    ${escapeHtml(item.label)}
                </div>

                <div class="req-checklist-mini-state">
                    <i class="fa-solid ${item.completado ? "fa-check" : "fa-xmark"}"></i>
                </div>
            </button>
        `;
    });

    html += `</div>`;

    return html;
}

function bindChecklistCandidatoEvents() {
    $(document)
        .off("click", ".btnChecklistCandidato")
        .on("click", ".btnChecklistCandidato", function () {
            const btn = $(this);

            const idDetalle = parseInt(btn.data("iddetalle"), 10) || 0;
            const nombre = btn.data("nombre") || "este candidato";

            const checklist = {
                descriptivoPuesto: {
                    requerido: normalizarBoolChecklist(btn.data("descriptivo-puesto")),
                    completado: false
                },
                examenMedico: {
                    requerido: normalizarBoolChecklist(btn.data("examen-medico")),
                    completado: false
                },
                estudiosMedicos: {
                    requerido: normalizarBoolChecklist(btn.data("estudios-medicos")),
                    completado: false
                },
                estudioSocioeconomico: {
                    requerido: normalizarBoolChecklist(btn.data("estudio-socioeconomico")),
                    completado: false
                },
                cartaNoAntecedentes: {
                    requerido: normalizarBoolChecklist(btn.data("carta-no-antecedentes")),
                    completado: false
                },
                evaluacionLiderazgoDisk: {
                    requerido: normalizarBoolChecklist(btn.data("evaluacion-liderazgo-disk")),
                    completado: false
                },
                cartaOfertaAprobacionGM: {
                    requerido: normalizarBoolChecklist(btn.data("carta-oferta-aprobacion-gm")),
                    completado: false
                },
                evaluacionSupervisor: {
                    requerido: normalizarBoolChecklist(btn.data("evaluacion-supervisor")),
                    completado: false
                }
            };

            if (idDetalle <= 0) {
                Swal.fire({
                    icon: "warning",
                    title: "No se puede actualizar",
                    text: "No se encontró el identificador del candidato.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-horario-popup swal-horario-popup-small',
                        confirmButton: 'swal-horario-confirm'
                    }
                });
                return;
            }

            abrirModalChecklistCandidato(idDetalle, nombre, checklist);
        });
}

function abrirModalChecklistCandidato(idDetalle, nombre, checklist) {
    const items = getChecklistItemsCandidato(checklist);

    let checklistHtml = "";

    items.forEach(item => {
        checklistHtml += `
            <label class="swal-checklist-card ${item.requerido ? "checked" : ""}"
                   data-checklist-card="${escapeAttr(item.key)}">
                <input type="checkbox"
                       class="swal-checklist-input"
                       data-checklist-key="${escapeAttr(item.key)}"
                       ${item.requerido ? "checked" : ""} />

                <div class="swal-checklist-icon">
                    <i class="fa-solid ${item.icon}"></i>
                </div>

                <div class="swal-checklist-text">
                    <div class="swal-checklist-title">${escapeHtml(item.label)}</div>
                    <div class="swal-checklist-sub">${item.requerido ? "Requerido" : "No requerido"}</div>
                </div>

                <div class="swal-checklist-check">
                    <i class="fa-solid ${item.requerido ? "fa-check" : "fa-xmark"}"></i>
                </div>
            </label>
        `;
    });

    pausarFocusTrapDetalleRequisicion();

    Swal.fire({
        html: `
            <div class="swal-checklist-wrap">
                <div class="swal-status-head">
                    <div class="swal-status-icon">
                        <i class="fa-solid fa-list-check"></i>
                    </div>

                    <div>
                        <div class="swal-status-kicker">Checklist requerido</div>
                        <h3 class="swal-status-title">${escapeHtml(nombre)}</h3>
                        <div class="swal-status-sub">
                            Selecciona los documentos o evaluaciones que aplican para este candidato.
                        </div>
                    </div>
                </div>

                <div class="swal-checklist-grid">
                    ${checklistHtml}
                </div>
            </div>
        `,
        width: 860,
        showCancelButton: true,
        confirmButtonText: "Guardar checklist",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        focusConfirm: false,
        focusCancel: false,
        allowEnterKey: false,
        returnFocus: false,
        customClass: {
            popup: 'swal-status-popup swal-checklist-popup',
            confirmButton: 'swal-status-confirm',
            cancelButton: 'swal-status-cancel'
        },
        didOpen: (popup) => {
            $(popup)
                .find(".swal-checklist-input")
                .off("change")
                .on("change", function () {
                    const input = $(this);
                    const card = input.closest(".swal-checklist-card");
                    const checked = input.is(":checked");

                    card.toggleClass("checked", checked);

                    card.find(".swal-checklist-sub")
                        .text(checked ? "Requerido" : "No requerido");

                    card.find(".swal-checklist-check i")
                        .removeClass("fa-check fa-xmark")
                        .addClass(checked ? "fa-check" : "fa-xmark");
                });
        },
        willClose: () => {
            reactivarFocusTrapDetalleRequisicion();
        },
        preConfirm: () => {
            const popup = Swal.getPopup();

            return {
                descriptivoPuesto: $(popup).find('[data-checklist-key="descriptivoPuesto"]').is(":checked"),
                examenMedico: $(popup).find('[data-checklist-key="examenMedico"]').is(":checked"),
                estudiosMedicos: $(popup).find('[data-checklist-key="estudiosMedicos"]').is(":checked"),
                estudioSocioeconomico: $(popup).find('[data-checklist-key="estudioSocioeconomico"]').is(":checked"),
                cartaNoAntecedentes: $(popup).find('[data-checklist-key="cartaNoAntecedentes"]').is(":checked"),
                evaluacionLiderazgoDisk: $(popup).find('[data-checklist-key="evaluacionLiderazgoDisk"]').is(":checked"),
                cartaOfertaAprobacionGM: $(popup).find('[data-checklist-key="cartaOfertaAprobacionGM"]').is(":checked"),
                evaluacionSupervisor: $(popup).find('[data-checklist-key="evaluacionSupervisor"]').is(":checked")
            };
        }
    }).then((result) => {
        if (!result.isConfirmed || !result.value) return;

        guardarChecklistCandidatoRequisicion(idDetalle, result.value);
    });
}

function guardarChecklistCandidatoRequisicion(idDetalle, checklist) {
    if (!window.appUrls || !window.appUrls.actualizarChecklistCandidatoRequisicion) {
        Swal.fire({
            icon: "warning",
            title: "Ruta no configurada",
            text: "Falta agregar window.appUrls.actualizarChecklistCandidatoRequisicion en la vista.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
        return;
    }

    Swal.fire({
        html: `
            <div class="swal-candidato-wrap">
                <div class="swal-candidato-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Guardando checklist...</span>
                </div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
            popup: 'swal-candidato-popup'
        }
    });

    $.ajax({
        url: window.appUrls.actualizarChecklistCandidatoRequisicion,
        type: "POST",
        dataType: "json",
        data: {
            idDetalle: idDetalle,
            descriptivoPuesto: checklist.descriptivoPuesto,
            examenMedico: checklist.examenMedico,
            estudiosMedicos: checklist.estudiosMedicos,
            estudioSocioeconomico: checklist.estudioSocioeconomico,
            cartaNoAntecedentes: checklist.cartaNoAntecedentes,
            evaluacionLiderazgoDisk: checklist.evaluacionLiderazgoDisk,
            cartaOfertaAprobacionGM: checklist.cartaOfertaAprobacionGM,
            evaluacionSupervisor: checklist.evaluacionSupervisor
        }
    }).done(function (r) {
        if (!r || !r.success) {
            Swal.fire({
                icon: "warning",
                title: "No se pudo actualizar",
                text: r && r.message ? r.message : "No fue posible actualizar el checklist.",
                confirmButtonText: "Cerrar",
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-horario-popup swal-horario-popup-small',
                    confirmButton: 'swal-horario-confirm'
                }
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Checklist actualizado",
            text: r.message || "El checklist fue actualizado correctamente.",
            timer: 1300,
            showConfirmButton: false
        });

        if (detalleRequisicionActual && detalleRequisicionActual.header) {
            abrirDetalleRequisicion(detalleRequisicionActual.header.idRequisicion);
        } else {
            cargarDashboardRequisiciones();
        }

    }).fail(function () {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo comunicar con el servidor.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
    });
}

function bindContratarCandidatoEvents() {
    $(document)
        .off("click", ".btnContratarCandidato")
        .on("click", ".btnContratarCandidato", function () {
            const btn = $(this);

            const idDetalle = parseInt(btn.data("iddetalle"), 10) || 0;
            const nombre = btn.data("nombre") || "este candidato";

            if (idDetalle <= 0) {
                Swal.fire({
                    icon: "warning",
                    title: "No se puede contratar",
                    text: "No se encontró el identificador del candidato.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-horario-popup swal-horario-popup-small',
                        confirmButton: 'swal-horario-confirm'
                    }
                });
                return;
            }

            pausarFocusTrapDetalleRequisicion();

            Swal.fire({
                html: `
                    <div class="swal-status-wrap">
                        <div class="swal-status-head">
                            <div class="swal-status-icon swal-hire-icon">
                                <i class="fa-solid fa-handshake"></i>
                            </div>

                            <div>
                                <div class="swal-status-kicker">Contratación</div>
                                <h3 class="swal-status-title">${escapeHtml(nombre)}</h3>
                                <div class="swal-status-sub">
                                    ¿Quiere contratar a este candidato?
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                width: 620,
                icon: null,
                showCancelButton: true,
                confirmButtonText: "Sí, contratar",
                cancelButtonText: "Cancelar",
                buttonsStyling: false,
                focusConfirm: false,
                focusCancel: false,
                allowEnterKey: false,
                returnFocus: false,
                customClass: {
                    popup: 'swal-status-popup',
                    confirmButton: 'swal-status-confirm',
                    cancelButton: 'swal-status-cancel'
                },
                willClose: () => {
                    reactivarFocusTrapDetalleRequisicion();
                }
            }).then((result) => {
                if (!result.isConfirmed) return;

                contratarCandidatoRequisicion(idDetalle);
            });
        });
}

function contratarCandidatoRequisicion(idDetalle) {
    if (!window.appUrls || !window.appUrls.contratarCandidatoRequisicion) {
        Swal.fire({
            icon: "warning",
            title: "Ruta no configurada",
            text: "Falta agregar window.appUrls.contratarCandidatoRequisicion en la vista.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
        return;
    }

    Swal.fire({
        html: `
            <div class="swal-candidato-wrap">
                <div class="swal-candidato-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Contratando candidato...</span>
                </div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
            popup: 'swal-candidato-popup'
        }
    });

    $.ajax({
        url: window.appUrls.contratarCandidatoRequisicion,
        type: "POST",
        dataType: "json",
        data: {
            idDetalle: idDetalle
        }
    }).done(function (r) {
        if (!r || !r.success) {
            Swal.fire({
                icon: "warning",
                title: "No se pudo contratar",
                text: r && r.message ? r.message : "No fue posible contratar el candidato.",
                confirmButtonText: "Cerrar",
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-horario-popup swal-horario-popup-small',
                    confirmButton: 'swal-horario-confirm'
                }
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Candidato contratado",
            text: r.message || "El candidato fue contratado correctamente.",
            timer: 1400,
            showConfirmButton: false
        });

        if (detalleRequisicionActual && detalleRequisicionActual.header) {
            abrirDetalleRequisicion(detalleRequisicionActual.header.idRequisicion);
        }

        cargarDashboardRequisiciones();

    }).fail(function () {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo comunicar con el servidor.",
            confirmButtonText: "Cerrar",
            buttonsStyling: false,
            customClass: {
                popup: 'swal-horario-popup swal-horario-popup-small',
                confirmButton: 'swal-horario-confirm'
            }
        });
    });
}

function bindChecklistSeguimientoEvents() {
    $(document)
        .off("click", ".btnChecklistSeguimientoItem")
        .on("click", ".btnChecklistSeguimientoItem", function () {
            const btn = $(this);

            const idDetalle = parseInt(btn.data("iddetalle"), 10) || 0;
            const campo = btn.data("campo") || "";
            const completadoActual = String(btn.data("completado")) === "1";
            const nuevoCompletado = !completadoActual;

            if (idDetalle <= 0 || !campo) {
                Swal.fire({
                    icon: "warning",
                    title: "No se puede actualizar",
                    text: "No se encontró la información del checklist.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: "swal-horario-popup swal-horario-popup-small",
                        confirmButton: "swal-horario-confirm"
                    }
                });
                return;
            }

            if (!window.appUrls || !window.appUrls.actualizarChecklistSeguimientoItem) {
                Swal.fire({
                    icon: "warning",
                    title: "Ruta no configurada",
                    text: "Falta agregar window.appUrls.actualizarChecklistSeguimientoItem en la vista.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: "swal-horario-popup swal-horario-popup-small",
                        confirmButton: "swal-horario-confirm"
                    }
                });
                return;
            }

            // Update visual inmediato para evitar parpadeo del modal
            actualizarMiniCheckVisual(btn, nuevoCompletado, true);

            $.ajax({
                url: window.appUrls.actualizarChecklistSeguimientoItem,
                type: "POST",
                dataType: "json",
                data: {
                    idDetalle: idDetalle,
                    campo: campo,
                    completado: nuevoCompletado
                }
            }).done(function (r) {
                if (!r || !r.success) {
                    // Si falla, regresamos visualmente al estado anterior
                    actualizarMiniCheckVisual(btn, completadoActual, false);

                    Swal.fire({
                        icon: "warning",
                        title: "No se pudo actualizar",
                        text: r && r.message ? r.message : "No fue posible actualizar el checklist.",
                        confirmButtonText: "Cerrar",
                        buttonsStyling: false,
                        customClass: {
                            popup: "swal-horario-popup swal-horario-popup-small",
                            confirmButton: "swal-horario-confirm"
                        }
                    });
                    return;
                }

                // Guardado correcto: dejamos el nuevo estado fijo
                actualizarMiniCheckVisual(btn, nuevoCompletado, false);

            }).fail(function () {
                // Si falla comunicación, revertimos
                actualizarMiniCheckVisual(btn, completadoActual, false);

                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo comunicar con el servidor.",
                    confirmButtonText: "Cerrar",
                    buttonsStyling: false,
                    customClass: {
                        popup: "swal-horario-popup swal-horario-popup-small",
                        confirmButton: "swal-horario-confirm"
                    }
                });
            });
        });
}

function actualizarMiniCheckVisual(btn, completado, cargando) {
    const $btn = $(btn);
    const $iconState = $btn.find(".req-checklist-mini-state i");

    $btn
        .removeClass("ok missing saving")
        .addClass(completado ? "ok" : "missing");

    if (cargando) {
        $btn.addClass("saving");
        $iconState
            .removeClass("fa-check fa-xmark")
            .addClass("fa-spinner fa-spin");

        $btn.prop("disabled", true);
        return;
    }

    $btn.removeClass("saving");
    $btn.prop("disabled", false);

    $btn.attr("data-completado", completado ? "1" : "0");
    $btn.data("completado", completado ? "1" : "0");

    $iconState
        .removeClass("fa-spinner fa-spin fa-check fa-xmark")
        .addClass(completado ? "fa-check" : "fa-xmark");
}