$('#logo').remove();
document.title = "FormulaDB Editor";

function customizeEditor() {

	if (true /* no right panel */) { 
		$("#vvveb-builder").addClass("no-right-panel");
		$(".component-properties-tab").show();
		Vvveb.Components.componentPropertiesElement = "#left-panel .component-properties";
	} else {
		$(".component-properties-tab").hide();
    }
        
    $('#toggle-file-manager-btn').parent().remove();
    document.body.style.setProperty('--db-panel-height', `250px`);
    document.body.style.setProperty('--builder-left-panel-width', '14vw');
    document.body.style.setProperty('--builder-right-panel-width', '14vw');
    document.body.style.setProperty('--builder-bottom-panel-height', '0px');

    // $('#filemanager').css({height: '100%'});
    // $('#filemanager .tree').css({height: '100%'});

    $('#top-panel').css({
        top: 'var(--db-panel-height)', 
        position: "fixed", 
        width: "100%",
        "border-top": "1px solid #ccc",
    });
    $('#left-panel,#right-panel,#canvas').css({
        top: 'calc(var(--db-panel-height) + var(--builder-header-top-height))',
        height: 'calc( 100vh - (var(--builder-header-top-height) + var(--builder-bottom-panel-height)) - var(--db-panel-height))',
    });

    //// Code Editor ///////////////////////////////////////////////////////////
    Vvveb.Gui.toggleEditor = function (isTable) {
		$("#bottom-panel").toggle();
		Vvveb.CodeEditor.toggle(isTable);
	};
    $('#bottom-panel').css({
        top: '0px', 
        bottom: 'initial', 
        height: 'var(--db-panel-height)',
        display: 'none',
    });
    
    $('#preview-btn').toggleClass('bg-light');

    //// Controls ///////////////////////////////////////////////////////////
    
    $('#top-panel').prepend(/*html*/`
        <frmdb-formula-editor></frmdb-formula-editor>
    `).css({
        display: "flex",
        'box-shadow': '0px 0px 4px #ccc',
    });
    
    // overwrite preview
    let prevPanelHeight = document.body.style.getPropertyValue('--db-panel-height');
    let orig_preview = Vvveb.Gui.preview;
    Vvveb.Gui.preview = function () {
        orig_preview();
        let dbEditor = $("frmdb-db-editor");
        if (dbEditor.hasClass("preview")) {
            document.body.style.setProperty('--db-panel-height', `${prevPanelHeight}`);
        } else {
            prevPanelHeight = document.body.style.getPropertyValue('--db-panel-height');
            document.body.style.setProperty('--db-panel-height', '0px');
        }
        dbEditor.toggleClass("preview");
        $(window.FrameDocument).find("body").get(0).classList.toggle('frmdb-preview');        
    }

    loadCss();
}

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

function loadCss() {
    $('body').append(/*html*/`<style>
    #left-panel .nav {
        font-size: 11px;
        font-weight: 600;
        height: 2rem;
        margin: 0;
        padding: 0;
        width: 100%;
        line-height: 2rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
        margin-bottom: 0rem;
        padding: 0rem 0rem 0.5rem 1rem;    
    }

    #left-panel .nav .nav-link {
        padding: 0 2px 0 2px;
        text-align: initial;
    }

    #left-panel .dropdown-menu {
        font-size: 11px;
        line-height: initial;
    }

    @font-face {
        font-family: "agGridBalham";
        src: url("data:application/x-font-ttf;charset=utf-8;base64,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") format("truetype");
        font-weight: normal;
        font-style: normal; }   
    </style>`)
}

async function customLoadPages() {

    await loadExternalScript('/formuladb/frmdb-editor.js');
    let params = new URLSearchParams(window.location.search);
    let [tenantName, appName, pageName] = [params.get('t'), params.get('a'), params.get('p')];
    console.info("Loading pages for ", tenantName, appName);
    let appBackend = new FrmdbBackendService(tenantName, appName);
    Vvveb.Gui.FRMDB_BACKEND_SERVICE = appBackend;
        
    $('#vvveb-builder').prepend(/* html */`
        <frmdb-db-editor data-frmdb-tenant="${tenantName}" data-frmdb-app="${appName}">
        </frmdb-db-editor>
    `);

    
    let app = await appBackend.getApp();
    let indexUrl = 'index-page-needed.html';
    let vvvebPages = [];
    for (let page of app.pages) {
        let url = `/${appBackend.tenantName}/${appBackend.appName}/${page.html}`;
        if (page.name === "index") indexUrl = url;
        vvvebPages.push({name: page.name, title: page.name, url});
    }

    //overwrite loadPage
    let orig_loadPage = Vvveb.FileManager.loadPage;
    Vvveb.FileManager.loadPage = function(name, allowedComponents = false, disableCache = true) {
        window.location.href = window.location.href.replace(/p=.*/, `p=${name}`);
    }

    let url = (vvvebPages.find(p => p.name == pageName) || {url: indexUrl}).url;
    Vvveb.Builder.init(url, function() {
        //run code after page/iframe is loaded
    });

    Vvveb.Gui.init();
    Vvveb.FileManager.init();
    Vvveb.FileManager.addPages(vvvebPages);
}

// load customized editor
$(document).ready(async function () {
    customizeEditor();
    await customLoadPages();

    $.fn.tooltip.Constructor.Default.whiteList.a = ['data-id', 'href'];
});
