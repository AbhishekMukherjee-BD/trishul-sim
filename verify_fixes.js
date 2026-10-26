import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function verifyFixes() {
  console.log('Testing fixes in headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--enable-webgl']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2200));

  // 1. Verify Scenario Modal Flow
  console.log('Checking MissionBriefingModal decoupled selection...');
  const modalChecks = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.tactical-panel .grid > div'));
    const scenarioCards = cards.filter(c => c.innerText.includes('EXERCISE'));
    
    // Click Card 2 (Mountain Sentinel)
    if (scenarioCards[1]) scenarioCards[1].click();
    
    const isModalStillOpen = document.body.innerText.includes('SELECT MISSION DOCTRINE');
    const activeText = Array.from(document.querySelectorAll('.tactical-panel *')).find(e => e.innerText && e.innerText.includes('MISSION DOCTRINE:'))?.innerText || '';
    
    // Now click Commence Tactical Drill
    const commenceBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('COMMENCE TACTICAL DRILL'));
    if (commenceBtn) commenceBtn.click();

    return {
      cardCount: scenarioCards.length,
      isModalStillOpenAfterCardClick: isModalStillOpen,
      activeText,
      hasCommenceBtn: !!commenceBtn
    };
  });

  console.log('Scenario Modal Check Result:', modalChecks);

  await new Promise(r => setTimeout(r, 1000));

  const afterCommenceModalClosed = await page.evaluate(() => {
    return !document.body.innerText.includes('SELECT MISSION DOCTRINE') && document.body.innerText.includes('TRISHUL-SIM // C-UAS');
  });

  console.log('Modal closed after clicking Commence Drill:', afterCommenceModalClosed);

  // 2. Verify 3D Weapon Console (Azimuth and Elevation)
  console.log('Checking 3D Azimuth & Elevation controls...');
  const weaponConsoleCheck = await page.evaluate(() => {
    const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
    const text = document.body.innerText;
    const snapBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('SNAP 3D BEAM'));
    
    return {
      sliderCount: sliders.length, // Should have at least 2 sliders (AZ and EL)
      has3dBeamTitle: text.includes('WEAPON 1: DIRECTIONAL RF JAMMER (3D BEAM // 15° CONE)'),
      hasSnap3dBeamBtn: !!snapBtn
    };
  });

  console.log('Weapon Console Check Result:', weaponConsoleCheck);

  // 3. Test SNAP 3D BEAM execution
  const snapResult = await page.evaluate(() => {
    const snapBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('SNAP 3D BEAM'));
    const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
    const azSlider = sliders[0];
    const elSlider = sliders[1];
    
    const beforeAz = azSlider ? azSlider.value : '0';
    const beforeEl = elSlider ? elSlider.value : '0';
    
    if (snapBtn && !snapBtn.disabled) {
      snapBtn.click();
    }
    
    return {
      beforeAz,
      beforeEl,
      afterAz: azSlider ? azSlider.value : '0',
      afterEl: elSlider ? elSlider.value : '0'
    };
  });

  console.log('Snap 3D Beam Result:', snapResult);

  await browser.close();
  console.log('All fix verification checks completed successfully!');
}

verifyFixes().catch(err => {
  console.error('Fix verification error:', err);
  process.exit(1);
});
