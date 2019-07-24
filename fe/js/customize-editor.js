
function removeRightColumn() {
    Vvveb.Gui.togglePanel("#right-panel", "--builder-right-panel-width");

    $("#vvveb-builder").toggleClass("no-right-panel");
    $(".component-properties-tab").toggle();
    
    Vvveb.Components.componentPropertiesElement = "#left-panel.component-properties";
    if ($("#properties").is(":visible")) $('.component-tab a').show().tab('show'); 

}

function customizeEditor() {

    $('#logo').remove();
    $('#toggle-file-manager-btn').parent().remove();
    $('#designer-mode-btn').remove();
    $('#download-btn').remove();

    removeRightColumn();

    // $('.drag-elements').hide();
    $('#filemanager').css({height: '100%'});
    $('#filemanager .tree').css({height: '100%'});
    $('#preview-btn').toggleClass('bg-light');

    let $topBtnGroup = $('#mobile-view').parent();
    $topBtnGroup.removeClass('responsive-btns')
        .prepend($('#save-btn'))
        .prepend($('#fullscreen-btn'))
        .prepend($('#preview-btn'))
        .prepend($('#undo-btn'))
        .prepend($('#redo-btn'))
        .prepend(
            /*html*/`
            <button id="db-editor" class="btn btn-light" title="Database Editor" data-vvveb-action="viewport">
                <i class="la la-database"></i>
            </button>
            <button id="html-editor" class="btn btn-light" title="HTML Editor" data-vvveb-action="viewport">
                <i class="la la-code"></i>
            </button>
            `)
        .children('button.btn').addClass('py-0')
    ;
    $topBtnGroup.siblings('.btn-group').remove();
    
    $('#top-panel').prepend(/*html*/`
        <button id="toggle-formula-editor" class="btn btn-light" title="Formula Editor">
            <i class="la la-facebook-square"></i>
        </button>  
        <frmdb-formula-editor></frmdb-formula-editor>
    `).css({
        display: "flex",
        'box-shadow': '0px 0px 4px #ccc',
    });

    document.body.style.setProperty('--db-panel-height', `220px`);
    document.body.style.setProperty('--builder-right-panel-width', '0px');
    
    $('#top-panel').css({
        top: 'var(--db-panel-height)', 
        position: "fixed", 
        width: "100%",
        "border-top": "1px solid #ccc",
    });
    $('#left-panel').css({ top: 'calc(var(--db-panel-height) + var(--builder-header-top-height))' });
    $('#canvas').css({top: 'calc(var(--db-panel-height) + var(--builder-header-top-height))'});
    
    let origPreviewFunc = Vvveb.Gui.preview;
    let prevPanelHeight = document.body.style.getPropertyValue('--db-panel-height');
    Vvveb.Gui.preview = function () {
        origPreviewFunc();
        $('#preview-btn').toggleClass('preview');
        if ($('#preview-btn').hasClass('preview')) {
            $('#preview-btn').prependTo('body');
            $('#db-left-panel, #db-main, #db-right-panel').hide();
            prevPanelHeight = document.body.style.getPropertyValue('--db-panel-height');
            document.body.style.setProperty('--db-panel-height', '0px');
        } else {
            $('#fullscreen-btn').before($('#preview-btn'));
            $('#db-left-panel, #db-main, #db-right-panel').show();
            document.body.style.setProperty('--db-panel-height', `${prevPanelHeight}`);
        }
    }

    Vvveb.Gui.toggleDatabaseEditor = function () {
        $("#vvveb-builder").toggleClass("bottom-panel-expand");
    };
    $('#toggleEditorJsExecute label small').text('Run js on edit');
    $('#code-editor-btn').contents().filter(function () {
        return this.nodeType == Node.TEXT_NODE && this.nodeValue.indexOf('Code') >= 0;
    })[0].nodeValue = " HTML";

    $('#code-editor-btn').parent()
    .removeClass('btn-group')
    .addClass('d-flex')
    .prepend(/* html */`
        <button id="database-editor-btn" data-view="mobile" class="btn btn-sm btn-light btn-sm" title="Code editor" data-vvveb-action="toggleDatabaseEditor">
            <i class="la la-database"></i> Database
        </button>

        <div class="" style="flex-basis: 60%">
            <textarea style="width: 100%; height: calc(var(--builder-bottom-panel-height) - 5px)">asdcascdasnlk  asdcnasncdladsc</textarea>
        </div>
    `)

    loadFonts();

    Promise.all([
        loadExternalScript('/formuladb/frmdb-editor.js'),
        loadExternalScript('/formuladb/frmdb-data-grid.js'),
    ]).then(() => {
        let p = new URLSearchParams(window.location.search);
        let [tenantName, appName] = [p.get('t'), p.get('a')];
        console.info("Loading pages for ", tenantName, appName);
        let appBackend = new FrmdbAppBackend(tenantName, appName);
    
        loadPages(appBackend);
        
        $('#vvveb-builder').prepend(/* html */`<frmdb-db-editor data-frmdb-tenant="${tenantName}" data-frmdb-app="${appName}"></frmdb-db-editor>`);
    });

}

$(document).ready(function () {
    // customizeOld();
    customizeEditor();
});

/** Any widgets that show/hide DOM elements must stop auto-play in order to let the user edit */
function stopAutoplayForEditing() {
    $('.owl-carousel').trigger('stop.owl.autoplay');
}

function resumeAutoplayForPreview() {
    $('.owl-carousel').trigger('play.owl.autoplay',[500]);
}

function loadExternalScript(scriptUrl) {
    return new Promise(resolve => {
        const scriptElement = document.createElement('script');
        scriptElement.src = scriptUrl;
        scriptElement.onload = resolve;
        document.body.appendChild(scriptElement);
    });
}

async function loadPages(appBackend) {
    let app = await appBackend.getApp();
    for (let page of app.pages) {
        Vvveb.FileManager.addPage(page.name, 
            {name: page.name, title: page.name, url: `/${appBackend.tenantName}/${appBackend.appName}/${page.html}`});
    }
    Vvveb.FileManager.loadPage("index");
}

function loadFonts() {
    $('body').append(`<style>
        @font-face {
            font-family: "agGridBalham";
            src: url("data:application/x-font-ttf;charset=utf-8;base64,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") format("truetype");
            font-weight: normal;
            font-style: normal;
        }    
    </style>`)
}
