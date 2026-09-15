const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--allow-file-access-from-files']});
 const p=await b.newPage(); p.on('console',m=>console.log('PAGE:',m.text())); p.on('pageerror',e=>console.log('ERR:',e.message));
 await p.setViewport({width:480,height:270});
 await p.goto(require('url').pathToFileURL(__dirname+'/smoke.html').href);
 await p.waitForFunction('window.done',{timeout:10000}).catch(e=>console.log('timeout'));
 await p.screenshot({path:'smoke.png'});
 await b.close();
})();
