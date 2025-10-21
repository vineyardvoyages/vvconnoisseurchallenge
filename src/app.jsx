import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, setLogLevel } from 'firebase/firestore';

// --- WINE QUIZ QUESTIONS BANK ---
// PASTE YOUR FULL ARRAY OF 100 QUESTIONS HERE
const WINE_QUIZ_QUESTIONS = [
  // Example Question (replace with your full list):
  // Example Question (replace with your full list):
  {
    question: "Which of the following is a red grape varietal?",
    options: ["Chardonnay", "Sauvignon Blanc", "Merlot", "Pinot Grigio"],
    correctAnswer: "Merlot",
    explanation: "Merlot is a popular red grape varietal known for its soft, approachable wines.",
    wrongAnswerExplanations: {
      "Chardonnay": "Chardonnay is a white grape varietal, not red.",
      "Sauvignon Blanc": "Sauvignon Blanc is a white grape varietal known for its crisp, acidic character.",
      "Pinot Grigio": "Pinot Grigio (also called Pinot Gris) is a white grape varietal."
    }
  },
  {
    question: "What is 'terroir' in winemaking?",
    options: [
      "A type of wine barrel",
      "The complete natural environment in which a wine is produced, including factors such as soil, topography, and climate.",
      "A winemaking technique",
      "A wine tasting term"
    ],
    correctAnswer: "The complete natural environment in which a wine is produced, including factors such as soil, topography, and climate.",
    explanation: "Terroir refers to the unique combination of environmental factors that affect a crop's phenotype, including climate, soil, and topography, and how they influence the wine's character.",
    wrongAnswerExplanations: {
      "A type of wine barrel": "Wine barrels are containers for aging wine, not environmental factors.",
      "A winemaking technique": "Winemaking techniques are processes used to make wine, not environmental conditions.",
      "A wine tasting term": "While terroir affects wine taste, it refers to environmental factors, not a tasting descriptor."
    }
  },
  {
    question: "Which country is the largest producer of wine globally?",
    options: ["France", "Italy", "Spain", "United States"],
    correctAnswer: "Italy",
    explanation: "While France is famous for its wines, Italy consistently holds the title of the world's largest wine producer by volume.",
    wrongAnswerExplanations: {
      "France": "France is the second-largest wine producer and is famous for quality, but Italy produces more by volume.",
      "Spain": "Spain has the most vineyard area planted but ranks third in production volume.",
      "United States": "The US is a major producer but ranks fourth globally in wine production."
    }
  },
  {
    question: "What is the primary grape used in traditional Champagne production?",
    options: ["Riesling", "Pinot Noir", "Syrah", "Zinfandel"],
    correctAnswer: "Pinot Noir",
    explanation: "Traditional Champagne is typically made from a blend of Chardonnay, Pinot Noir, and Pinot Meunier grapes. Pinot Noir is one of the key red grapes used.",
    wrongAnswerExplanations: {
      "Riesling": "Riesling is primarily grown in Germany and Alsace, not used in Champagne production.",
      "Syrah": "Syrah is a red grape from the Rhône Valley, not permitted in Champagne.",
      "Zinfandel": "Zinfandel is primarily associated with California wines, not Champagne."
    }
  },
  {
    question: "Which of these wines is typically dry and crisp, often with notes of green apple and citrus?",
    options: ["Cabernet Sauvignon", "Chardonnay (oaked)", "Sauvignon Blanc", "Zinfandel"],
    correctAnswer: "Sauvignon Blanc",
    explanation: "Sauvignon Blanc is known for its high acidity and aromatic profile, often featuring notes of green apple, lime, and herbaceousness.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "Cabernet Sauvignon is a full-bodied red wine with darker fruit flavors and tannins.",
      "Chardonnay (oaked)": "Oaked Chardonnay is typically full-bodied with buttery, vanilla notes rather than crisp citrus.",
      "Zinfandel": "Zinfandel is typically a bold red wine with berry and spice flavors, not citrusy."
    }
  },
  {
    question: "Which wine region is famous for its Cabernet Sauvignon wines?",
    options: ["Bordeaux, France", "Napa Valley, USA", "Barossa Valley, Australia", "All of the above"],
    correctAnswer: "All of the above",
    explanation: "Cabernet Sauvignon is a widely planted grape, and all listed regions are renowned for producing high-quality Cabernet Sauvignon wines.",
    wrongAnswerExplanations: {
      "Bordeaux, France": "While Bordeaux is famous for Cabernet Sauvignon, it's not the only region—all options are correct.",
      "Napa Valley, USA": "While Napa Valley is renowned for Cabernet Sauvignon, other regions also excel—all options are correct.",
      "Barossa Valley, Australia": "While Barossa Valley produces excellent Cabernet Sauvignon, other regions do too—all options are correct."
    }
  },
  {
    question: "What is the ideal serving temperature for most red wines?",
    options: ["Chilled (40-45°F)", "Room temperature (68-72°F)", "Cool (60-65°F)", "Warm (75-80°F)"],
    correctAnswer: "Cool (60-65°F)",
    explanation: "Most red wines are best served slightly cooler than typical room temperature to highlight their fruit and acidity.",
    wrongAnswerExplanations: {
      "Chilled (40-45°F)": "This temperature is too cold and would mute the wine's aromas and flavors.",
      "Room temperature (68-72°F)": "Modern room temperature is often too warm, making the wine taste flat and overly alcoholic.",
      "Warm (75-80°F)": "This temperature is too warm and would make the wine taste unbalanced with harsh alcohol."
    }
  },
  {
    question: "Which of these is a sparkling wine from Spain?",
    options: ["Prosecco", "Champagne", "Cava", "Lambrusco"],
    correctAnswer: "Cava",
    explanation: "Cava is a popular sparkling wine from Spain, produced using the traditional method, similar to Champagne.",
    wrongAnswerExplanations: {
      "Prosecco": "Prosecco is a sparkling wine from Italy, not Spain.",
      "Champagne": "Champagne is a sparkling wine exclusively from the Champagne region of France.",
      "Lambrusco": "Lambrusco is a sparkling red wine from Italy, not Spain."
    }
  },
  {
    question: "What does 'tannin' refer to in wine?",
    options: ["Sweetness", "Acidity", "Bitterness and astringency", "Alcohol content"],
    correctAnswer: "Bitterness and astringency",
    explanation: "Tannins are naturally occurring compounds found in grape skins, seeds, and stems, contributing to a wine's bitterness, astringency, and structure.",
    wrongAnswerExplanations: {
      "Sweetness": "Sweetness in wine comes from residual sugar, not tannins.",
      "Acidity": "Acidity provides tartness and freshness, which is different from the dry, bitter sensation of tannins.",
      "Alcohol content": "Alcohol provides warmth and body, but tannins create the dry, mouth-puckering sensation."
    }
  },
  {
    question: "Which white grape is typically used to make dry, aromatic wines in the Loire Valley, France?",
    options: ["Chardonnay", "Sauvignon Blanc", "Pinot Gris", "Riesling"],
    correctAnswer: "Sauvignon Blanc",
    explanation: "Sauvignon Blanc is the key grape in regions like Sancerre and Pouilly-Fumé in the Loire Valley, producing crisp, mineral-driven wines.",
    wrongAnswerExplanations: {
      "Chardonnay": "While Chardonnay grows in Loire Valley, it's not the primary grape for dry, aromatic wines there.",
      "Pinot Gris": "Pinot Gris is more associated with Alsace than the Loire Valley's aromatic wines.",
      "Riesling": "Riesling is primarily grown in Germany and Alsace, not the Loire Valley."
    }
  },
  {
    question: "Which of these is a sweet, fortified wine from mainland Portugal?",
    options: ["Sherry", "Port", "Madeira", "Marsala"],
    correctAnswer: "Port",
    explanation: "Port is a sweet, fortified wine produced in the Douro Valley of northern Portugal.",
    wrongAnswerExplanations: {
      "Sherry": "Sherry is a fortified wine from Spain, not Portugal.",
      "Madeira": "While Madeira is from Portuguese territory (Madeira Island), the island of Madeira is not on the mainland.",
      "Marsala": "Marsala is a fortified wine from Sicily, Italy, not Portugal."
    }
  },
  {
    question: "What is the process of converting grape juice into wine called?",
    options: ["Distillation", "Fermentation", "Maceration", "Clarification"],
    correctAnswer: "Fermentation",
    explanation: "Fermentation is the chemical process by which yeast converts the sugars in grape juice into alcohol and carbon dioxide.",
    wrongAnswerExplanations: {
      "Distillation": "Distillation is used to make spirits, not wine, by heating and cooling to concentrate alcohol.",
      "Maceration": "Maceration is the contact between grape skins and juice to extract color and flavor.",
      "Clarification": "Clarification removes sediment and particles from wine after fermentation is complete."
    }
  },
  {
    question: "Which red grape is known for its light body, high acidity, and red fruit flavors, often associated with Burgundy?",
    options: ["Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah"],
    correctAnswer: "Pinot Noir",
    explanation: "Pinot Noir is a delicate red grape varietal that thrives in cooler climates and is the primary grape of Burgundy, France.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "Cabernet Sauvignon is full-bodied with dark fruit flavors, not light-bodied like Pinot Noir.",
      "Merlot": "Merlot is medium to full-bodied with plush textures, different from Pinot Noir's delicate style.",
      "Syrah": "Syrah produces full-bodied, powerful wines with dark fruit and spice, opposite of Pinot Noir's elegance."
    }
  },
  {
    question: "What is the term for the legs or tears that form on the inside of a wine glass?",
    options: ["Viscosity", "Acidity", "Alcohol content", "Tannin level"],
    correctAnswer: "Alcohol content",
    explanation: "Wine legs are an indicator of a wine's alcohol content and, to some extent, its glycerol content, which contributes to viscosity.",
    wrongAnswerExplanations: {
      "Viscosity": "While legs indicate viscosity, they're primarily formed due to alcohol content differences.",
      "Acidity": "Acidity affects taste and preservation but doesn't create the legs phenomenon.",
      "Tannin level": "Tannins create structure and mouthfeel but don't cause the legs that form on glass sides."
    }
  },
  {
    question: "Which of these is a common fault in wine, often described as smelling like wet cardboard or moldy basement?",
    options: ["Brettanomyces", "Cork taint (TCA)", "Oxidation", "Volatile Acidity"],
    correctAnswer: "Cork taint (TCA)",
    explanation: "Cork taint, caused by TCA, is a common wine fault that imparts unpleasant musty or moldy aromas.",
    wrongAnswerExplanations: {
      "Brettanomyces": "Brettanomyces creates barnyard, medicinal, or Band-Aid aromas, not wet cardboard smells.",
      "Oxidation": "Oxidation causes wines to smell like sherry, nuts, or bruised apples, not musty basement odors.",
      "Volatile Acidity": "Volatile acidity smells like vinegar or nail polish remover, not wet cardboard."
    }
  },
  {
    question: "Which type of wine is typically served with oysters?",
    options: ["Cabernet Sauvignon", "Chardonnay (oaked)", "Sauvignon Blanc", "Merlot"],
    correctAnswer: "Sauvignon Blanc",
    explanation: "Crisp, high-acid white wines like Sauvignon Blanc are excellent pairings for oysters, as they cut through the brininess.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "This full-bodied red would overpower the delicate flavor of oysters.",
      "Chardonnay (oaked)": "Oaked Chardonnay's buttery richness would clash with oysters' briny, mineral character.",
      "Merlot": "This soft red wine would be too heavy and wouldn't complement oysters' oceanic flavors."
    }
  },
  {
    question: "Which noble rot-affected sweet wine, often described as 'liquid gold', comes from a specific region in Bordeaux?",
    options: ["Tokaji", "Ice Wine", "Sauternes", "Port"],
    correctAnswer: "Sauternes",
    explanation: "Sauternes is a highly prized sweet wine from the Bordeaux region of France, made from grapes affected by Botrytis cinerea (noble rot).",
    wrongAnswerExplanations: {
      "Tokaji": "Tokaji is a noble rot wine from Hungary, not Bordeaux.",
      "Ice Wine": "Ice wine is made from frozen grapes, not noble rot, and comes from cool climates like Canada and Germany.",
      "Port": "Port is a fortified wine from Portugal, not a noble rot wine from Bordeaux."
    }
  },
  {
    question: "What is the primary grape used in the production of Chianti wine?",
    options: ["Nebbiolo", "Barbera", "Sangiovese", "Montepulciano"],
    correctAnswer: "Sangiovese",
    explanation: "Sangiovese is the signature red grape of Tuscany, Italy, and the primary component of Chianti wine.",
    wrongAnswerExplanations: {
      "Nebbiolo": "Nebbiolo is the grape used in Barolo and Barbaresco from Piedmont, not Chianti.",
      "Barbera": "Barbera is another Piedmontese grape variety, not the main grape in Chianti.",
      "Montepulciano": "Montepulciano is used in wines from Abruzzo and other central Italian regions, not Chianti."
    }
  },
  {
    question: "Which wine glass shape is generally recommended for enjoying red wines?",
    options: ["Flute", "Coupe", "Tulip", "Bordeaux or Burgundy glass"],
    correctAnswer: "Bordeaux or Burgundy glass",
    explanation: "Larger, wider-bowled glasses like Bordeaux or Burgundy allow red wines to breathe and express their aromas fully.",
    wrongAnswerExplanations: {
      "Flute": "Flutes are designed for sparkling wines to preserve bubbles, not for red wines.",
      "Coupe": "Coupes are shallow glasses better suited for cocktails or some sparkling wines, not reds.",
      "Tulip": "While tulip-shaped glasses can work, Bordeaux/Burgundy glasses are specifically designed for red wines."
    }
  },
  {
    question: "What is the term for the sediment found in aged red wines?",
    options: ["Tartrates", "Lees", "Fining agents", "Dregs"],
    correctAnswer: "Dregs",
    explanation: "Dregs refer to the sediment, typically consisting of dead yeast cells, grape solids, and tartrates, found at the bottom of bottles of aged wine.",
    wrongAnswerExplanations: {
      "Tartrates": "Tartrates are crystalline deposits but only one component of wine sediment.",
      "Lees": "Lees are dead yeast cells that settle during fermentation, not the general term for bottle sediment.",
      "Fining agents": "Fining agents are substances added to clarify wine, not the natural sediment that forms."
    }
  },
  {
    question: "This dark-skinned grape is famously called Shiraz in Australia and is known for producing full-bodied, spicy red wines in the Rhône Valley of France. What is its name?",
    options: ["Pinot Noir", "Merlot", "Syrah", "Zinfandel"],
    correctAnswer: "Syrah",
    explanation: "Syrah or Shiraz is a versatile dark-skinned grape known for producing powerful, peppery, and dark-fruited wines in both the Old and New World.",
    wrongAnswerExplanations: {
      "Pinot Noir": "Pinot Noir produces light-bodied, elegant wines, not full-bodied spicy ones.",
      "Merlot": "Merlot creates softer, more approachable wines, not the bold, spicy character described.",
      "Zinfandel": "Zinfandel is primarily associated with California, not the Rhône Valley or Australia."
    }
  },
  {
    question: "What is vintage on a wine label?",
    options: ["The year the wine was bottled", "The year the grapes were harvested", "The age of the winery", "The specific vineyard site"],
    correctAnswer: "The year the grapes were harvested",
    explanation: "The vintage year on a wine label indicates when the grapes used to make that wine were picked.",
    wrongAnswerExplanations: {
      "The year the wine was bottled": "Bottling year is different from vintage; wines can be bottled months or years after harvest.",
      "The age of the winery": "Vintage refers to the grape harvest year, not when the winery was established.",
      "The specific vineyard site": "Vineyard site information is separate from vintage dating."
    }
  },
  {
    question: "Which of these is a common characteristic of an oaked Chardonnay?",
    options: ["Light and crisp", "Notes of butter, vanilla, and toast", "High acidity and citrus", "Sweet and fruity"],
    correctAnswer: "Notes of butter, vanilla, and toast",
    explanation: "Aging Chardonnay in oak barrels imparts flavors and aromas of butter, vanilla, and toast.",
    wrongAnswerExplanations: {
      "Light and crisp": "Oak aging typically makes Chardonnay fuller-bodied and richer, not light and crisp.",
      "High acidity and citrus": "While Chardonnay can have good acidity, oaking tends to soften it and add richer flavors.",
      "Sweet and fruity": "Oaked Chardonnay is usually dry with complex flavors rather than simply sweet and fruity."
    }
  },
  {
    question: "What is the purpose of decanting wine?",
    options: ["To chill the wine", "To remove sediment and allow the wine to breathe", "To add flavors to the wine", "To warm the wine"],
    correctAnswer: "To remove sediment and allow the wine to breathe",
    explanation: "Decanting separates sediment from the wine and exposes the wine to oxygen, helping it open up and develop aromas.",
    wrongAnswerExplanations: {
      "To chill the wine": "Decanting doesn't chill wine; in fact, it can warm it slightly through air exposure.",
      "To add flavors to the wine": "Decanting doesn't add flavors but helps existing flavors develop through aeration.",
      "To warm the wine": "While decanting might warm wine slightly, that's not its primary purpose."
    }
  },
  {
    question: "Which Italian wine is famous for being produced in the Piedmont region and made from Nebbiolo grapes?",
    options: ["Chianti", "Prosecco", "Barolo", "Soave"],
    correctAnswer: "Barolo",
    explanation: "Barolo is a highly esteemed red wine from Piedmont, Italy, known for its powerful tannins and aging potential, made from Nebbiolo grapes.",
    wrongAnswerExplanations: {
      "Chianti": "Chianti is from Tuscany and made primarily from Sangiovese, not Nebbiolo.",
      "Prosecco": "Prosecco is a sparkling wine made from Glera grapes, not Nebbiolo.",
      "Soave": "Soave is a white wine from Veneto made from Garganega grapes, not Nebbiolo."
    }
  },
  {
    question: "What is the term for a wine that tastes sweet?",
    options: ["Dry", "Off-dry", "Sweet", "Semi-sweet"],
    correctAnswer: "Sweet",
    explanation: "A sweet wine has a noticeable amount of residual sugar, making it taste sweet.",
    wrongAnswerExplanations: {
      "Dry": "Dry wines have little to no residual sugar, making them taste not sweet.",
      "Off-dry": "Off-dry wines have a small amount of residual sugar but are not noticeably sweet.",
      "Semi-sweet": "Semi-sweet indicates some sweetness but is not the general term for sweet wines."
    }
  },
  {
    question: "Which region is known for producing high-quality Riesling wines?",
    options: ["Bordeaux, France", "Mosel, Germany", "Napa Valley, USA", "Tuscany, Italy"],
    correctAnswer: "Mosel, Germany",
    explanation: "The Mosel region in Germany is world-renowned for its crisp, aromatic, and often off-dry Riesling wines.",
    wrongAnswerExplanations: {
      "Bordeaux, France": "Bordeaux is famous for red blends and sweet wines, not Riesling.",
      "Napa Valley, USA": "Napa Valley is known for Cabernet Sauvignon and Chardonnay, not primarily Riesling.",
      "Tuscany, Italy": "Tuscany is famous for Sangiovese-based wines like Chianti, not Riesling."
    }
  },
  {
    question: "What is the difference between red and white wine production?",
    options: [
      "Red wine uses red grapes, white wine uses white grapes",
      "Red wine ferments with grape skins, white wine typically does not",
      "Red wine is aged in oak, white wine is not",
      "Red wine is always dry, white wine is always sweet"
    ],
    correctAnswer: "Red wine ferments with grape skins, white wine typically does not",
    explanation: "The key difference is that red wines get their color, tannins, and much of their flavor from fermenting with the grape skins, while white wines are usually pressed before fermentation.",
    wrongAnswerExplanations: {
      "Red wine uses red grapes, white wine uses white grapes": "White wine can be made from red grapes if the skins are removed quickly.",
      "Red wine is aged in oak, white wine is not": "Both red and white wines can be aged in oak or not, depending on the style desired.",
      "Red wine is always dry, white wine is always sweet": "Both red and white wines can be dry or sweet depending on the winemaking process."
    }
  },
  {
    question: "Which of these is a common food pairing for Pinot Noir?",
    options: ["Grilled steak", "Spicy Asian cuisine", "Salmon or duck", "Heavy cream sauces"],
    correctAnswer: "Salmon or duck",
    explanation: "Pinot Noir's lighter body and red fruit notes make it an excellent match for fattier fish like salmon and poultry like duck.",
    wrongAnswerExplanations: {
      "Grilled steak": "Grilled steak pairs better with fuller-bodied reds like Cabernet Sauvignon or Syrah.",
      "Spicy Asian cuisine": "Spicy foods typically pair better with off-dry whites or lighter, fruit-forward reds.",
      "Heavy cream sauces": "Heavy cream sauces usually pair better with fuller-bodied whites like oaked Chardonnay."
    }
  },
  {
    question: "What is the term for the natural sugars remaining in wine after fermentation?",
    options: ["Glucose", "Fructose", "Residual Sugar", "Sucrose"],
    correctAnswer: "Residual Sugar",
    explanation: "Residual sugar (RS) refers to the grape sugars that are not converted into alcohol during fermentation, contributing to a wine's sweetness.",
    wrongAnswerExplanations: {
      "Glucose": "While glucose is one type of sugar in grapes, 'residual sugar' is the general term used in winemaking.",
      "Fructose": "While fructose is another grape sugar, 'residual sugar' encompasses all remaining sugars.",
      "Sucrose": "Sucrose is table sugar, not the natural grape sugars found in wine."
    }
  },
  {
    question: "Which grape is known for producing full-bodied, often spicy red wines in the Rhône Valley, France?",
    options: ["Gamay", "Pinot Noir", "Syrah", "Merlot"],
    correctAnswer: "Syrah",
    explanation: "Syrah or Shiraz is the dominant red grape in the Northern Rhône, producing powerful, peppery, and dark-fruited wines.",
    wrongAnswerExplanations: {
      "Gamay": "Gamay produces light, fruity wines in Beaujolais, not the full-bodied spicy wines of the Rhône.",
      "Pinot Noir": "Pinot Noir creates elegant, light-bodied wines in Burgundy, not the powerful Rhône reds.",
      "Merlot": "Merlot is associated with Bordeaux and produces softer wines, not the spicy Rhône style."
    }
  },
  {
    question: "What is the typical alcohol content of a dry table wine?",
    options: ["2-5%", "8-10%", "11-15%", "18-20%"],
    correctAnswer: "11-15%",
    explanation: "Most dry table wines fall within the 11-15% ABV (Alcohol by Volume) range.",
    wrongAnswerExplanations: {
      "2-5%": "This is the alcohol range for beer, not wine.",
      "8-10%": "This is too low for most table wines, though some very light wines might reach 10%.",
      "18-20%": "This is the alcohol range for fortified wines like Port or Sherry, not table wines."
    }
  },
  {
    question: "Which of these is a common characteristic of a dry wine?",
    options: ["Sweet taste", "Absence of sweetness", "High acidity", "Low alcohol"],
    correctAnswer: "Absence of sweetness",
    explanation: "A dry wine is one in which all or most of the grape sugars have been converted to alcohol during fermentation, resulting in no perceptible sweetness.",
    wrongAnswerExplanations: {
      "Sweet taste": "This is the opposite of dry - sweet wines have noticeable residual sugar.",
      "High acidity": "While many dry wines have good acidity, this isn't the defining characteristic of dryness.",
      "Low alcohol": "Dry wines can have various alcohol levels; dryness refers to sugar content, not alcohol."
    }
  },
  {
    question: "What is the name of the white wine region in Burgundy, France, famous for unoaked Chardonnay?",
    options: ["Pouilly-Fumé", "Sancerre", "Chablis", "Vouvray"],
    correctAnswer: "Chablis",
    explanation: "Chablis is a sub-region of Burgundy known for producing crisp, mineral-driven Chardonnay wines that are typically unoaked.",
    wrongAnswerExplanations: {
      "Pouilly-Fumé": "Pouilly-Fumé is in the Loire Valley and known for Sauvignon Blanc, not Chardonnay.",
      "Sancerre": "Sancerre is also in the Loire Valley and famous for Sauvignon Blanc, not Chardonnay.",
      "Vouvray": "Vouvray is in the Loire Valley and known for Chenin Blanc, not Chardonnay."
    }
  },
  {
    question: "Which grape varietal is often described as having notes of blackcurrant, cedar, and tobacco?",
    options: ["Pinot Noir", "Merlot", "Cabernet Sauvignon", "Zinfandel"],
    correctAnswer: "Cabernet Sauvignon",
    explanation: "Cabernet Sauvignon is renowned for its classic aromas and flavors of blackcurrant (cassis), alongside herbal, cedar, and tobacco notes.",
    wrongAnswerExplanations: {
      "Pinot Noir": "Pinot Noir typically shows red fruit flavors like cherry and strawberry, not blackcurrant and cedar.",
      "Merlot": "Merlot usually displays plum and chocolate notes, softer than Cabernet's structure.",
      "Zinfandel": "Zinfandel is known for jammy berry flavors and spice, not the structured cassis and cedar notes."
    }
  },
  {
    question: "What is the term for the process of allowing wine to age in the bottle before release?",
    options: ["Malolactic fermentation", "Racking", "Bottle aging", "Fining"],
    correctAnswer: "Bottle aging",
    explanation: "Bottle aging allows wine to develop more complex flavors and aromas over time.",
    wrongAnswerExplanations: {
      "Malolactic fermentation": "This is a secondary fermentation process that converts malic acid to lactic acid.",
      "Racking": "Racking is transferring wine from one container to another to separate it from sediment.",
      "Fining": "Fining is adding agents to clarify wine by removing particles and impurities."
    }
  },
  {
    question: "Which type of wine is typically served as an aperitif (before a meal)?",
    options: ["Sweet dessert wine", "Full-bodied red wine", "Dry sparkling wine", "Oaked Chardonnay"],
    correctAnswer: "Dry sparkling wine",
    explanation: "Dry sparkling wines like Brut Champagne or Cava are excellent aperitifs, stimulating the palate without being too heavy.",
    wrongAnswerExplanations: {
      "Sweet dessert wine": "Sweet wines are typically served with or after dessert, not as an aperitif.",
      "Full-bodied red wine": "Heavy reds would be too overwhelming before a meal and might dull the palate.",
      "Oaked Chardonnay": "While possible, the richness of oaked Chardonnay is less ideal than crisp sparkling wine."
    }
  },
  {
    question: "What is a 'blend' in winemaking?",
    options: [
      "Mixing different vintages of the same wine",
      "Mixing different grape varietals to create a single wine",
      "Adding water to wine",
      "Filtering wine"
    ],
    correctAnswer: "Mixing different grape varietals to create a single wine",
    explanation: "A wine blend combines two or more different grape varietals to achieve a desired balance of flavors, aromas, and structure.",
    wrongAnswerExplanations: {
      "Mixing different vintages of the same wine": "This would be called a multi-vintage blend, but most blends refer to different grape varieties.",
      "Adding water to wine": "Adding water is illegal in most wine regions and would be called adulteration, not blending.",
      "Filtering wine": "Filtering is a clarification process, not blending of different components."
    }
  },
  {
    question: "Which of these is a common characteristic of a full-bodied wine?",
    options: ["Light and watery texture", "Rich, heavy, and mouth-filling sensation", "High acidity", "Sweet taste"],
    correctAnswer: "Rich, heavy, and mouth-filling sensation",
    explanation: "Full-bodied wines have a rich, weighty, and sometimes viscous feel in the mouth, often due to higher alcohol content and extract.",
    wrongAnswerExplanations: {
      "Light and watery texture": "This describes light-bodied wines, the opposite of full-bodied.",
      "High acidity": "While full-bodied wines can have good acidity, this isn't the defining characteristic of body.",
      "Sweet taste": "Full-bodied wines can be dry or sweet; body refers to weight and texture, not sweetness."
    }
  },
  {
    question: "What is the purpose of a wine stopper or preserver?",
    options: ["To chill the wine", "To remove sediment", "To prevent oxidation and keep wine fresh after opening", "To add bubbles"],
    correctAnswer: "To prevent oxidation and keep wine fresh after opening",
    explanation: "Wine stoppers and preservers are designed to create an airtight seal or remove oxygen from an opened bottle, extending the wine's freshness.",
    wrongAnswerExplanations: {
      "To chill the wine": "Wine stoppers don't chill wine; refrigeration or ice buckets are used for chilling.",
      "To remove sediment": "Sediment is removed by decanting or careful pouring, not by stoppers.",
      "To add bubbles": "Bubbles are created during fermentation; stoppers actually help preserve existing bubbles."
    }
  },
  {
    question: "Which grape varietal is the primary component of most white wines from Alsace, France?",
    options: ["Chardonnay", "Sauvignon Blanc", "Riesling", "Pinot Grigio"],
    correctAnswer: "Riesling",
    explanation: "Alsace is unique in France for producing varietally labeled wines, with Riesling being one of its noble grapes.",
    wrongAnswerExplanations: {
      "Chardonnay": "While grown in Alsace, Chardonnay is not one of the primary noble grapes of the region.",
      "Sauvignon Blanc": "Sauvignon Blanc is not a major grape variety in Alsace.",
      "Pinot Grigio": "While Pinot Gris (same grape) is grown in Alsace, Riesling is more prominent."
    }
  },
  {
    question: "What is the term for the practice of cultivating grapes for winemaking?",
    options: ["Agriculture", "Horticulture", "Viticulture", "Vinification"],
    correctAnswer: "Viticulture",
    explanation: "Viticulture is the science, production, and study of grapes, which primarily deals with grape cultivation for wine.",
    wrongAnswerExplanations: {
      "Agriculture": "Agriculture is the broad practice of farming, not specific to grape growing.",
      "Horticulture": "Horticulture is the general cultivation of garden crops, not specific to wine grapes.",
      "Vinification": "Vinification is the process of making wine from grapes, not growing them."
    }
  },
  {
    question: "Which of these is a common aroma found in Sauvignon Blanc?",
    options: ["Black cherry", "Vanilla", "Grass or gooseberry", "Chocolate"],
    correctAnswer: "Grass or gooseberry",
    explanation: "Sauvignon Blanc is often characterized by its herbaceous notes, including grass, bell pepper, and gooseberry.",
    wrongAnswerExplanations: {
      "Black cherry": "Black cherry is typically associated with red wines like Cabernet Sauvignon or Merlot.",
      "Vanilla": "Vanilla comes from oak aging and isn't characteristic of typical Sauvignon Blanc.",
      "Chocolate": "Chocolate notes are found in red wines, particularly those with oak aging or certain varietals."
    }
  },
  {
    question: "What is the name of the sweet wine made from grapes frozen on the vine?",
    options: ["Port", "Sherry", "Ice Wine", "Marsala"],
    correctAnswer: "Ice Wine",
    explanation: "Ice wine or Eiswein is a type of dessert wine produced from grapes that have been frozen while still on the vine.",
    wrongAnswerExplanations: {
      "Port": "Port is a fortified wine from Portugal, not made from frozen grapes.",
      "Sherry": "Sherry is a fortified wine from Spain, not made from frozen grapes.",
      "Marsala": "Marsala is a fortified wine from Sicily, not made from frozen grapes."
    }
  },
  {
    question: "Which red grape is a key component of 'Super Tuscan' wines?",
    options: ["Nebbiolo", "Sangiovese", "Primitivo", "Montepulciano"],
    correctAnswer: "Sangiovese",
    explanation: "While Super Tuscans often include international varietals like Cabernet Sauvignon, Sangiovese remains the backbone of many, if not all, of them.",
    wrongAnswerExplanations: {
      "Nebbiolo": "Nebbiolo is from Piedmont and used in Barolo, not Super Tuscan wines.",
      "Primitivo": "Primitivo is primarily grown in southern Italy, not Tuscany.",
      "Montepulciano": "Montepulciano is used in central Italian wines but not typically in Super Tuscans."
    }
  },
  {
    question: "What does 'DOCG' signify on an Italian wine label?",
    options: ["Denomination of Controlled Origin", "Highest level of Italian wine classification", "Table wine", "Sweet wine"],
    correctAnswer: "Highest level of Italian wine classification",
    explanation: "DOCG (Denominazione di Origine Controllata e Garantita) is the highest classification for Italian wines, indicating strict quality control.",
    wrongAnswerExplanations: {
      "Denomination of Controlled Origin": "This is a partial translation but doesn't convey that it's the highest level.",
      "Table wine": "Table wine is the lowest classification in Italy, opposite of DOCG.",
      "Sweet wine": "DOCG refers to quality level, not sweetness level of the wine."
    }
  },
  {
    question: "Which of these is typically a light-bodied red wine?",
    options: ["Cabernet Sauvignon", "Syrah", "Pinot Noir", "Zinfandel"],
    correctAnswer: "Pinot Noir",
    explanation: "Pinot Noir is known for its delicate structure and lighter body compared to other red varietals.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "Cabernet Sauvignon is typically full-bodied with high tannins and intense flavors.",
      "Syrah": "Syrah produces full-bodied, powerful wines with dark fruit and spice.",
      "Zinfandel": "Zinfandel can range from medium to full-bodied, usually with higher alcohol content."
    }
  },
  {
    question: "What is the term for the 'bouquet' of a wine?",
    options: ["Its color", "Its taste", "Its aromas developed from aging", "Its sweetness level"],
    correctAnswer: "Its aromas developed from aging",
    explanation: "The bouquet refers to the complex aromas that develop in a wine as a result of fermentation and aging, particularly in the bottle.",
    wrongAnswerExplanations: {
      "Its color": "Color refers to visual appearance, not aromatic characteristics.",
      "Its taste": "Taste refers to flavors on the palate, while bouquet is about aroma.",
      "Its sweetness level": "Sweetness is a taste characteristic, not related to bouquet."
    }
  },
  {
    question: "Which white grape is known for producing full-bodied, often buttery wines, especially when oaked?",
    options: ["Riesling", "Sauvignon Blanc", "Pinot Grigio", "Chardonnay"],
    correctAnswer: "Chardonnay",
    explanation: "Chardonnay is a versatile grape that can produce a wide range of styles, but it's particularly known for its full-bodied, buttery, and often oak-influenced expressions.",
    wrongAnswerExplanations: {
      "Riesling": "Riesling typically produces lighter, more aromatic wines with floral and citrus notes.",
      "Sauvignon Blanc": "Sauvignon Blanc is known for crisp, herbaceous wines, not buttery, full-bodied ones.",
      "Pinot Grigio": "Pinot Grigio typically produces light, crisp wines, not full-bodied, buttery ones."
    }
  },
  {
    question: "What is the ideal temperature range for storing most wines long-term?",
    options: ["30-40°F", "45-65°F", "70-80°F", "Below 30°F"],
    correctAnswer: "45-65°F",
    explanation: "Most wines are best stored at a consistent temperature between 45-65°F (7-18°C) to ensure proper aging and prevent spoilage.",
    wrongAnswerExplanations: {
      "30-40°F": "This is too cold and could cause wine to freeze, potentially pushing out corks or damaging the wine.",
      "70-80°F": "This is too warm and would accelerate aging, potentially causing wines to deteriorate quickly.",
      "Below 30°F": "Freezing temperatures would damage the wine and could cause bottles to break."
    }
  },
  {
    question: "Which of these terms describes a wine with high acidity?",
    options: ["Flabby", "Crisp", "Soft", "Round"],
    correctAnswer: "Crisp",
    explanation: "A wine with high acidity is often described as crisp or tart, providing a refreshing sensation on the palate.",
    wrongAnswerExplanations: {
      "Flabby": "Flabby describes wines with low acidity that lack structure and freshness.",
      "Soft": "Soft typically refers to wines with low tannins or acidity, the opposite of crisp.",
      "Round": "Round describes wines that are well-balanced and smooth, not necessarily high in acidity."
    }
  },
  {
    question: "What is the purpose of sulfur dioxide (SO2) in winemaking?",
    options: ["To add sweetness", "To remove color", "As an antioxidant and antimicrobial agent", "To increase alcohol content"],
    correctAnswer: "As an antioxidant and antimicrobial agent",
    explanation: "SO2 is commonly used in winemaking to protect the wine from oxidation and inhibit unwanted microbial growth.",
    wrongAnswerExplanations: {
      "To add sweetness": "SO2 doesn't add sweetness; residual sugar provides sweetness in wine.",
      "To remove color": "SO2 doesn't remove color; it helps preserve the wine's existing characteristics.",
      "To increase alcohol content": "Alcohol comes from fermentation of sugars; SO2 doesn't affect alcohol levels."
    }
  },
  {
    question: "Which grape is used to make the famous sparkling wine Prosecco?",
    options: ["Chardonnay", "Pinot Noir", "Glera", "Riesling"],
    correctAnswer: "Glera",
    explanation: "Prosecco is an Italian sparkling wine made primarily from the Glera grape.",
    wrongAnswerExplanations: {
      "Chardonnay": "Chardonnay is used in Champagne and other sparkling wines, but not Prosecco.",
      "Pinot Noir": "Pinot Noir is used in Champagne production but not in Prosecco.",
      "Riesling": "Riesling is used for still wines and some sparkling wines in Germany, not Prosecco."
    }
  },
  {
    question: "What is the term for a wine that has a strong, unpleasant smell of vinegar?",
    options: ["Oxidized", "Corked", "Volatile Acidity", "Brettanomyces"],
    correctAnswer: "Volatile Acidity",
    explanation: "Volatile acidity (VA) is a wine fault characterized by aromas of vinegar or nail polish remover, caused by acetic acid bacteria.",
    wrongAnswerExplanations: {
      "Oxidized": "Oxidized wines smell like sherry, nuts, or bruised apples, not vinegar.",
      "Corked": "Corked wines smell musty or like wet cardboard, not vinegary.",
      "Brettanomyces": "Brettanomyces creates barnyard or medicinal aromas, not vinegar smells."
    }
  },
  {
    question: "Which type of wine is typically served with chocolate desserts?",
    options: ["Dry red wine", "Dry white wine", "Sweet fortified wine (e.g., Port)", "Sparkling wine"],
    correctAnswer: "Sweet fortified wine (e.g., Port)",
    explanation: "Sweet, rich wines like Port or Banyuls pair well with chocolate, as their sweetness and intensity can stand up to the dessert.",
    wrongAnswerExplanations: {
      "Dry red wine": "Dry reds would contrast harshly with chocolate's sweetness and richness.",
      "Dry white wine": "Dry whites would be overwhelmed by chocolate's intensity and richness.",
      "Sparkling wine": "While possible, sparkling wine's acidity and bubbles don't complement chocolate as well as sweet wines."
    }
  },
  {
    question: "What does 'non-vintage' (NV) mean on a sparkling wine label?",
    options: ["It's a very old wine", "It's a blend of wines from different harvest years", "It's a low-quality wine", "It's a wine made without grapes"],
    correctAnswer: "It's a blend of wines from different harvest years",
    explanation: "Non-vintage wines are blends of wines from multiple years, created to maintain a consistent house style.",
    wrongAnswerExplanations: {
      "It's a very old wine": "Non-vintage doesn't indicate age, just that multiple years are blended.",
      "It's a low-quality wine": "Many high-quality Champagnes are non-vintage; it's about consistency, not quality.",
      "It's a wine made without grapes": "All wine is made from grapes; this refers to vintage dating, not ingredients."
    }
  },
  {
    question: "Which of these is a common characteristic of a tannic red wine?",
    options: ["Smooth and soft", "Drying sensation in the mouth", "Fruity and sweet", "Light-bodied"],
    correctAnswer: "Drying sensation in the mouth",
    explanation: "Tannins create a drying, sometimes bitter, sensation in the mouth, especially noticeable on the gums and tongue.",
    wrongAnswerExplanations: {
      "Smooth and soft": "High tannins create texture and grip, opposite of smooth and soft.",
      "Fruity and sweet": "Tannins affect mouthfeel and structure, not fruitiness or sweetness.",
      "Light-bodied": "Tannic wines are usually medium to full-bodied; tannins add weight and structure."
    }
  },
  {
    question: "What is the term for the process of removing dead yeast cells and other solids from wine after fermentation?",
    options: ["Racking", "Fining", "Filtration", "All of the above"],
    correctAnswer: "All of the above",
    explanation: "Racking, fining, and filtration are all methods used to clarify wine by removing suspended solids and impurities.",
    wrongAnswerExplanations: {
      "Racking": "Racking is one method, but fining and filtration also remove solids.",
      "Fining": "Fining is one method, but racking and filtration also clarify wine.",
      "Filtration": "Filtration is one method, but racking and fining also remove particles."
    }
  },
 {
    question: "What is now considered the most widely planted wine grape variety in the world?",
    options: ["Merlot", "Airén", "Cabernet Sauvignon", "Chardonnay"],
    correctAnswer: "Cabernet Sauvignon",
    explanation: "For many years, the Spanish grape Airén held the top spot. However, due to recent global planting trends, Cabernet Sauvignon has now surpassed it to become the world's most cultivated wine grape.",
    wrongAnswerExplanations: {
      "Merlot": "Merlot is the second most planted grape variety, very close behind Cabernet Sauvignon.",
      "Airén": "Airén was historically the most planted grape, primarily used for Spanish brandy, but its plantings have been in decline.",
      "Chardonnay": "Chardonnay is the world's most popular white wine grape but is not the most planted overall."
    }
  }
  {
    question: "What is the name of the sweet, fortified wine from Jerez, Spain?",
    options: ["Port", "Madeira", "Sherry", "Marsala"],
    correctAnswer: "Sherry",
    explanation: "Sherry is a fortified wine made from white grapes that are grown near the city of Jerez de la Frontera in Andalusia, Spain.",
    wrongAnswerExplanations: {
      "Port": "Port is a fortified wine from Portugal, not Spain.",
      "Madeira": "Madeira is a fortified wine from the Portuguese island of Madeira.",
      "Marsala": "Marsala is a fortified wine from Sicily, Italy, not Spain."
    }
  },
  {
    question: "Which of these is a common aroma found in aged Pinot Noir?",
    options: ["Green apple", "Citrus", "Forest floor or mushroom", "Tropical fruit"],
    correctAnswer: "Forest floor or mushroom",
    explanation: "As Pinot Noir ages, it often develops complex tertiary aromas of forest floor, mushroom, and savory notes.",
    wrongAnswerExplanations: {
      "Green apple": "Green apple is more characteristic of white wines like Sauvignon Blanc or young Chardonnay.",
      "Citrus": "Citrus notes are typical of white wines, not aged Pinot Noir.",
      "Tropical fruit": "Tropical fruit aromas are found in wines from warm climates or certain white varieties, not aged Pinot Noir."
    }
  },
  {
    question: "What is the term for the body of a wine?",
    options: ["Its color intensity", "Its perceived weight or fullness in the mouth", "Its sweetness level", "Its alcohol content"],
    correctAnswer: "Its perceived weight or fullness in the mouth",
    explanation: "The body of a wine refers to its perceived weight and fullness on the palate, often influenced by alcohol, residual sugar, and extract.",
    wrongAnswerExplanations: {
      "Its color intensity": "Color is visual; body is about tactile sensation in the mouth.",
      "Its sweetness level": "Sweetness is about sugar content; body is about weight and texture.",
      "Its alcohol content": "While alcohol affects body, body is the overall perception of weight, not just alcohol level."
    }
  },
  {
    question: "Which type of wine is typically served very chilled, often as a dessert wine?",
    options: ["Dry red wine", "Dry white wine", "Ice Wine", "Rosé wine"],
    correctAnswer: "Ice Wine",
    explanation: "Ice wine or Eiswein is a sweet dessert wine that is best served very chilled to enhance its sweetness and acidity.",
    wrongAnswerExplanations: {
      "Dry red wine": "Red wines are typically served at cellar temperature, not very chilled.",
      "Dry white wine": "White wines are served chilled but not as cold as dessert wines.",
      "Rosé wine": "Rosé is served chilled but not as cold as sweet dessert wines like Ice Wine."
    }
  },
  // --- Northern Virginia Specific Questions (100 questions) ---
  {
    question: "Which grape varietal is considered Virginia's signature white grape?",
    options: ["Chardonnay", "Viognier", "Sauvignon Blanc", "Albariño"],
    correctAnswer: "Viognier",
    explanation: "Viognier is Virginia's official state grape, known for its aromatic and full-bodied white wines that thrive in the state's climate.",
    wrongAnswerExplanations: {
      "Chardonnay": "While grown in Virginia, Chardonnay is not the official state grape.",
      "Sauvignon Blanc": "Sauvignon Blanc is grown in Virginia but isn't the signature grape variety.",
      "Albariño": "Albariño is a newer variety showing promise in Virginia but isn't the signature grape."
    }
  },
  {
    question: "Which Virginia AVA is known for its high-quality Chardonnay and Cabernet Franc, located near the town of Middleburg?",
    options: ["Monticello AVA", "Virginia Peninsula AVA", "Middleburg AVA", "Shenandoah Valley AVA"],
    correctAnswer: "Middleburg AVA",
    explanation: "The Middleburg AVA (American Viticultural Area) is a prominent wine region in Northern Virginia, known for its rolling hills and diverse soils.",
    wrongAnswerExplanations: {
      "Monticello AVA": "Monticello AVA is in central Virginia around Charlottesville, not near Middleburg.",
      "Virginia Peninsula AVA": "Virginia Peninsula AVA is in southeastern Virginia, not near Middleburg.",
      "Shenandoah Valley AVA": "Shenandoah Valley AVA is in northwestern Virginia, not near Middleburg."
    }
  },
  {
    question: "Which red grape varietal is often referred to as Virginia's answer to Cabernet Franc due to its success in the state?",
    options: ["Merlot", "Cabernet Franc", "Petit Verdot", "Norton"],
    correctAnswer: "Cabernet Franc",
    explanation: "Cabernet Franc thrives in Virginia's climate, producing wines with red fruit, herbal notes, and often a distinctive peppery character.",
    wrongAnswerExplanations: {
      "Merlot": "While Merlot grows in Virginia, it doesn't have the same standout reputation as Cabernet Franc.",
      "Petit Verdot": "Petit Verdot does well in Virginia but isn't referred to as 'Virginia's answer' to anything.",
      "Norton": "Norton is a native American grape, not comparable to Cabernet Franc's European style."
    }
  },
  {
    question: "What is a common challenge for grape growing in Northern Virginia's climate?",
    options: ["Too much sun", "Lack of rainfall", "Humidity and late spring frosts", "Too cold in winter"],
    correctAnswer: "Humidity and late spring frosts",
    explanation: "Virginia's humid summers and unpredictable spring frosts can pose significant challenges for grape growers, requiring careful vineyard management.",
    wrongAnswerExplanations: {
      "Too much sun": "Virginia actually has good sun exposure; excessive sun isn't typically a problem.",
      "Lack of rainfall": "Virginia receives adequate rainfall; drought is not a common issue.",
      "Too cold in winter": "While winters can be cold, extreme cold isn't the primary challenge."
    }
  },
  {
    question: `What is a core benefit of a partnership between Vineyard Voyages and Loudoun County wineries?`,
    options: ["Mass production of wine for the tours", "Lower prices on all wines", "Exclusive access and unique tasting experiences", "Only full bottle sales"],
    correctAnswer: "Exclusive access and unique tasting experiences",
    explanation: "Partnerships allow Vineyard Voyages to provide unique, behind-the-scenes experiences and direct access for guests.",
    wrongAnswerExplanations: {
      "Mass production of wine for the tours": "Partnerships are for experience, not mass production.",
      "Lower prices on all wines": "While there may be some benefits, the focus is on experience, not discounts.",
      "Only full bottle sales": "Wineries still offer tastings and by-the-glass options, not just full bottles."
    }
  },
  {
    question: "What is a common red grape varietal grown in Northern Virginia, known for its deep color and firm tannins?",
    options: ["Pinot Noir", "Petit Verdot", "Gamay", "Zinfandel"],
    correctAnswer: "Petit Verdot",
    explanation: "Petit Verdot, traditionally a blending grape in Bordeaux, has found success in Virginia as a standalone varietal, producing bold, structured wines.",
    wrongAnswerExplanations: {
      "Pinot Noir": "Pinot Noir produces light-colored wines with soft tannins, opposite of the description.",
      "Gamay": "Gamay creates light, fruity wines, not deeply colored tannic wines.",
      "Zinfandel": "Zinfandel isn't commonly grown in Northern Virginia's climate."
    }
  },
  {
    question: "Which historical figure is credited with early attempts to grow European grapes in Virginia?",
    options: ["George Washington", "Thomas Jefferson", "James Madison", "Patrick Henry"],
    correctAnswer: "Thomas Jefferson",
    explanation: "Thomas Jefferson was a passionate advocate for viticulture and made significant efforts to establish European grapevines at Monticello.",
    wrongAnswerExplanations: {
      "George Washington": "While Washington was interested in agriculture, Jefferson was more focused on viticulture.",
      "James Madison": "Madison wasn't particularly associated with early Virginia viticulture efforts.",
      "Patrick Henry": "Patrick Henry wasn't known for involvement in early Virginia wine growing attempts."
    }
  },
  {
    question: "Which type of climate does Northern Virginia have, generally suitable for grape growing?",
    options: ["Mediterranean", "Desert", "Humid Continental", "Tropical"],
    correctAnswer: "Humid Continental",
    explanation: "Northern Virginia experiences a humid continental climate, characterized by warm, humid summers and cold winters, which presents both opportunities and challenges for viticulture.",
    wrongAnswerExplanations: {
      "Mediterranean": "Mediterranean climates are dry in summer, unlike Virginia's humid summers.",
      "Desert": "Desert climates are extremely dry, completely different from Virginia's humid climate.",
      "Tropical": "Tropical climates are consistently warm year-round, unlike Virginia's seasonal variations."
    }
  },
  {
    question: "Which type of soil is common in some Northern Virginia vineyards, contributing to mineral notes in wines?",
    options: ["Sandy soil", "Clay soil", "Loamy soil", "Slate or rocky soil"],
    correctAnswer: "Slate or rocky soil",
    explanation: "Some areas of Northern Virginia, particularly in the foothills, have rocky or slate-rich soils that can impart distinct minerality to the wines.",
    wrongAnswerExplanations: {
      "Sandy soil": "Sandy soils drain well but don't typically contribute mineral notes.",
      "Clay soil": "Clay soils retain water but don't typically impart mineral characteristics.",
      "Loamy soil": "Loamy soils are fertile but don't typically contribute mineral notes."
    }
  },
  {
    question: "Which of these is a hybrid grape varietal sometimes grown in Virginia, known for its disease resistance?",
    options: ["Cabernet Sauvignon", "Chardonnay", "Chambourcin", "Merlot"],
    correctAnswer: "Chambourcin",
    explanation: "Chambourcin is a French-American hybrid grape that offers good disease resistance, making it suitable for Virginia's humid climate.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "Cabernet Sauvignon is a European vinifera grape, not a hybrid.",
      "Chardonnay": "Chardonnay is a European vinifera grape, not a hybrid.",
      "Merlot": "Merlot is a European vinifera grape, not a hybrid."
    }
  },
  {
    question: "True or False: Virginia is one of the oldest wine-producing states in the United States.",
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "Virginia has a long history of winemaking, dating back to the early colonial period, making it one of the oldest wine states.",
    wrongAnswerExplanations: {
      "False": "Virginia indeed has one of the longest histories of winemaking in the United States."
    }
  },
  {
    question: "Which type of wine is Virginia increasingly gaining recognition for, besides its still wines?",
    options: ["Fortified wines", "Dessert wines", "Sparkling wines", "Organic wines"],
    correctAnswer: "Sparkling wines",
    explanation: "Virginia's terroir and winemaking expertise are increasingly producing high-quality sparkling wines, often made using the traditional method.",
    wrongAnswerExplanations: {
      "Fortified wines": "Virginia is not particularly known for fortified wine production.",
      "Dessert wines": "While some dessert wines are made, sparkling wines are gaining more widespread recognition.",
      "Organic wines": "While some organic wines are made, sparkling wines are a specific category gaining recognition."
    }
  },
  {
    question: "What is a common challenge for Virginia winemakers related to bird damage?",
    options: ["Birds eating grapes", "Birds nesting in barrels", "Birds spreading disease", "Birds damaging trellises"],
    correctAnswer: "Birds eating grapes",
    explanation: "Birds can cause significant damage to ripening grape crops, leading to the use of netting or other deterrents in vineyards.",
    wrongAnswerExplanations: {
      "Birds nesting in barrels": "Birds do not typically nest in wine barrels.",
      "Birds spreading disease": "While birds can spread some diseases, grape consumption is the primary concern.",
      "Birds damaging trellises": "Birds do not typically damage vineyard infrastructure."
    }
  },
  {
    question: "What is a common food pairing for Virginia ham?",
    options: ["Light white wine", "Sweet dessert wine", "Dry Rosé or light-bodied red like Cabernet Franc", "Sparkling wine"],
    correctAnswer: "Dry Rosé or light-bodied red like Cabernet Franc",
    explanation: "The saltiness and richness of Virginia ham pair well with a crisp dry rosé or a fruit-forward, slightly herbal Cabernet Franc.",
    wrongAnswerExplanations: {
      "Light white wine": "Light whites may be overpowered by the richness and saltiness of the ham.",
      "Sweet dessert wine": "Sweet wines would clash with the salty, savory character of the ham.",
      "Sparkling wine": "While possible, a dry rosé or light red is a more classic and complementary pairing."
    }
  },
  {
    question: "True or False: All grapes grown in Northern Virginia are native American varietals.",
    options: ["True", "False"],
    correctAnswer: "False",
    explanation: "While some native and hybrid varietals are grown, European (Vitis vinifera) grapes like Viognier, Cabernet Franc, and Chardonnay are widely cultivated and form the backbone of Virginia's fine wine industry.",
    wrongAnswerExplanations: {
      "True": "Virginia grows many European vinifera grapes, not just native American varietals."
    }
  },
  {
    question: "What is an 'AVA' in the context of Virginia wine?",
    options: ["American Vineyard Association", "Appellation of Virginia Award", "American Viticultural Area", "Agricultural Vintner Alliance"],
    correctAnswer: "American Viticultural Area",
    explanation: "An AVA (American Viticultural Area) is a designated wine grape-growing region in the United States distinguishable by geographic features.",
    wrongAnswerExplanations: {
      "American Vineyard Association": "This is not a real organization related to AVAs.",
      "Appellation of Virginia Award": "This is not what AVA stands for.",
      "Agricultural Vintner Alliance": "This is not what AVA stands for."
    }
  },
  {
    question: "Which of these is a common characteristic of Virginia's climate that influences its wines?",
    options: ["Very dry summers", "High humidity", "Consistently cold temperatures", "Volcanic soil"],
    correctAnswer: "High humidity",
    explanation: "Virginia's humid summers can lead to challenges like fungal diseases but also contribute to the unique character of its wines.",
    wrongAnswerExplanations: {
      "Very dry summers": "Virginia summers are humid, not dry.",
      "Consistently cold temperatures": "Virginia has warm summers and variable temperatures, not consistently cold ones.",
      "Volcanic soil": "Virginia doesn't have significant volcanic soils; this is more characteristic of regions like Oregon."
    }
  },
  {
    question: "Many Northern Virginia wineries offer scenic views. What kind of landscape is typical?",
    options: ["Coastal beaches", "Flat plains", "Rolling hills and mountains", "Dense urban cityscape"],
    correctAnswer: "Rolling hills and mountains",
    explanation: "Northern Virginia's wine country is characterized by picturesque rolling hills and proximity to the Blue Ridge Mountains.",
    wrongAnswerExplanations: {
      "Coastal beaches": "Northern Virginia is inland, not coastal.",
      "Flat plains": "Northern Virginia has rolling topography, not flat plains.",
      "Dense urban cityscape": "Wine country is in rural areas, not urban settings."
    }
  },
  {
    question: "What is a common practice in Virginia vineyards to manage humidity and promote air circulation?",
    options: ["Dense planting", "Leaf pulling (canopy management)", "Deep irrigation", "Using plastic covers"],
    correctAnswer: "Leaf pulling (canopy management)",
    explanation: "Canopy management, including leaf pulling, helps improve air circulation around grape clusters, reducing disease risk in humid climates.",
    wrongAnswerExplanations: {
      "Dense planting": "Dense planting would reduce air circulation, not improve it.",
      "Deep irrigation": "Irrigation doesn't directly address air circulation issues.",
      "Using plastic covers": "Plastic covers would trap humidity, not reduce it."
    }
  },
  {
    question: "Which white grape varietal, known for its crispness, is gaining popularity in Virginia?",
    options: ["Pinot Grigio", "Riesling", "Albariño", "Gewürztraminer"],
    correctAnswer: "Albariño",
    explanation: "Albariño, a Spanish white grape, is showing promise in Virginia, producing vibrant, aromatic wines with good acidity.",
    wrongAnswerExplanations: {
      "Pinot Grigio": "While grown, Pinot Grigio is not specifically noted as gaining popularity for its crispness.",
      "Riesling": "Riesling is grown but Albariño is the specific variety gaining recognition for its vibrant, crisp style.",
      "Gewürztraminer": "Gewürztraminer is not commonly associated with Virginia's emerging crisp white wines."
    }
  },
  {
    question: "True or False: Virginia is the second-largest wine-producing state on the East Coast.",
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "Virginia is indeed the second-largest wine-producing state on the East Coast, after New York.",
    wrongAnswerExplanations: {
      "False": "Virginia's wine industry has grown significantly, making it a major producer on the East Coast."
    }
  },
  {
    question: "Which grape varietal is often blended with Cabernet Franc in Virginia to create Bordeaux-style red blends?",
    options: ["Pinot Noir", "Merlot", "Riesling", "Viognier"],
    correctAnswer: "Merlot",
    explanation: "Merlot is a common blending partner with Cabernet Franc (and sometimes Cabernet Sauvignon and Petit Verdot) in Virginia's Bordeaux-style red wines.",
    wrongAnswerExplanations: {
      "Pinot Noir": "Pinot Noir is not typically used in Bordeaux-style blends.",
      "Riesling": "Riesling is a white grape, not used in red blends.",
      "Viognier": "Viognier is a white grape, not used in red blends."
    }
  },
  {
    question: "What is a common wine tourism experience emphasized in Northern Virginia?",
    options: ["Budget-friendly travel", "Luxury and personalized attention", "Self-guided tours with no interaction", "Large group parties only"],
    correctAnswer: "Luxury and personalized attention",
    explanation: "Northern Virginia's wine tourism often emphasizes a premium experience with comfortable amenities and tailored itineraries.",
    wrongAnswerExplanations: {
      "Budget-friendly travel": "While some options are affordable, the region is known for a premium, not budget-focused, experience.",
      "Self-guided tours with no interaction": "Wineries pride themselves on personal, guided experiences.",
      "Large group parties only": "Many wineries cater to small, intimate groups as well as larger parties."
    }
  },
  {
    question: "Which of these is a well-known wine region in Virginia, south of Northern Virginia?",
    options: ["Finger Lakes", "Willamette Valley", "Monticello AVA", "Sonoma County"],
    correctAnswer: "Monticello AVA",
    explanation: "The Monticello AVA, centered around Charlottesville, is another significant and historic wine region in Virginia.",
    wrongAnswerExplanations: {
      "Finger Lakes": "This is a wine region in New York.",
      "Willamette Valley": "This is a wine region in Oregon.",
      "Sonoma County": "This is a wine region in California."
    }
  },
  {
    question: "What is the purpose of 'netting' in Virginia vineyards?",
    options: ["To support the vines", "To protect grapes from birds and animals", "To provide shade", "To collect rainwater"],
    correctAnswer: "To protect grapes from birds and animals",
    explanation: "Netting is a common solution used by vineyards to prevent birds and other wildlife from consuming ripening grapes.",
    wrongAnswerExplanations: {
      "To support the vines": "This is the purpose of trellising, not netting.",
      "To provide shade": "While nets can provide some shade, their primary purpose is protection from wildlife.",
      "To collect rainwater": "Rainwater is managed through drainage systems, not netting."
    }
  },
  {
    question: "Which grape is the primary variety in the wines from the 'Rioja' region?",
    options: ["Tempranillo", "Grenache", "Cabernet Sauvignon", "Syrah"],
    correctAnswer: "Tempranillo",
    explanation: "The Tempranillo grape is the backbone of most red wines from the Rioja region of Spain.",
    wrongAnswerExplanations: {
      "Grenache": "Grenache is used in Rioja, but Tempranillo is the primary grape.",
      "Cabernet Sauvignon": "Cabernet Sauvignon is not traditionally used in Rioja wines.",
      "Syrah": "Syrah is not traditionally used in Rioja wines."
    }
  }

[
  // --- General Wine Knowledge ---
  {
    question: "How is most still Rosé wine made?",
    options: ["Mixing red and white wine", "Brief contact with red grape skins", "Using a special pink grape", "Adding red food coloring"],
    correctAnswer: "Brief contact with red grape skins",
    explanation: "Most Rosé gets its color from allowing the juice to have limited contact with the skins of red grapes, a process called maceration.",
    wrongAnswerExplanations: {
      "Mixing red and white wine": "This is only permitted for Rosé Champagne in Europe, but not for still Rosé wines.",
      "Using a special pink grape": "While some grapes have a pinkish hue (like Pinot Grigio), Rosé is typically made from red grapes.",
      "Adding red food coloring": "This is not a permitted or practiced method in quality winemaking."
    }
  },
  {
    question: "What does 'Trocken' mean on a German wine label?",
    options: ["Sweet", "Semi-sweet", "Dry", "Sparkling"],
    correctAnswer: "Dry",
    explanation: "Trocken is the German word for 'dry,' indicating a wine with very little residual sugar.",
    wrongAnswerExplanations: {
      "Sweet": "The German term for sweet is 'süß' or designations like 'Spätlese' can be sweet.",
      "Semi-sweet": "Terms like 'feinherb' or 'halbtrocken' indicate semi-sweet or off-dry.",
      "Sparkling": "Sparkling wine in Germany is called 'Sekt'."
    }
  },
  {
    question: "What factor has the biggest influence on a wine's 'body'?",
    options: ["Color", "Acidity", "Alcohol Content", "Age"],
    correctAnswer: "Alcohol Content",
    explanation: "Alcohol is more viscous than water, so higher alcohol content generally leads to a fuller, heavier feeling in the mouth, which we perceive as body.",
    wrongAnswerExplanations: {
      "Color": "Color is a visual attribute and does not directly determine the wine's body.",
      "Acidity": "Acidity contributes to a wine's freshness and structure, but not its weight or body.",
      "Age": "While age can change a wine's texture, alcohol is the primary driver of body."
    }
  },
  {
    question: "The wine region of Burgundy in France is most famous for which two grape varieties?",
    options: ["Cabernet Sauvignon and Merlot", "Pinot Noir and Chardonnay", "Syrah and Viognier", "Sauvignon Blanc and Chenin Blanc"],
    correctAnswer: "Pinot Noir and Chardonnay",
    explanation: "Burgundy is the ancestral home of Pinot Noir (for red wines) and Chardonnay (for white wines), and it sets the world standard for both.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon and Merlot": "These are the primary grapes of the Bordeaux region, not Burgundy.",
      "Syrah and Viognier": "These are the signature grapes of the Rhône Valley.",
      "Sauvignon Blanc and Chenin Blanc": "These grapes are most famously associated with the Loire Valley."
    }
  },
  {
    question: "What is 'phylloxera'?",
    options: ["A type of beneficial yeast", "A microscopic aphid that destroys grapevines", "A method for filtering wine", "A soil type found in Spain"],
    correctAnswer: "A microscopic aphid that destroys grapevines",
    explanation: "Phylloxera is a devastating pest that attacks the roots of grapevines. The solution was to graft European vines onto resistant American rootstock.",
    wrongAnswerExplanations: {
      "A type of beneficial yeast": "Yeast is a fungus used for fermentation; phylloxera is an insect pest.",
      "A method for filtering wine": "This is a winemaking step, not a vineyard pest.",
      "A soil type found in Spain": "This is a pest, not a soil type."
    }
  },
  {
    question: "A 'vertical tasting' involves tasting which of the following?",
    options: ["Different wines from the same region", "The same wine from different vintages", "Wines from different countries", "Wines served in very tall glasses"],
    correctAnswer: "The same wine from different vintages",
    explanation: "A vertical tasting is a great way to see how a specific wine from a single winery evolves over time by tasting several different years side-by-side.",
    wrongAnswerExplanations: {
      "Different wines from the same region": "This is known as a 'horizontal tasting.'",
      "Wines from different countries": "This would simply be a comparative tasting with no specific name.",
      "Wines served in very tall glasses": "The shape of the glass does not define the type of tasting."
    }
  },
  {
    question: "Which country is famous for its Pinotage, a cross between Pinot Noir and Cinsaut?",
    options: ["Australia", "Chile", "South Africa", "New Zealand"],
    correctAnswer: "South Africa",
    explanation: "Pinotage is South Africa's signature red grape, created there in 1925. It often has unique notes of smoke and dark fruits.",
    wrongAnswerExplanations: {
        "Australia": "Australia is famous for Shiraz, not Pinotage.",
        "Chile": "Chile's signature red grape is Carmenère.",
        "New Zealand": "New Zealand is most renowned for Sauvignon Blanc and Pinot Noir."
    }
  },
  {
    question: "What does the term 'brut' on a Champagne label signify?",
    options: ["Very sweet", "A red sparkling wine", "A specific blend of grapes", "Dry"],
    correctAnswer: "Dry",
    explanation: "Brut is a term used to indicate the sweetness level in sparkling wine, with Brut being the most common and signifying a dry style.",
    wrongAnswerExplanations: {
      "Very sweet": "The term for very sweet sparkling wine is 'Doux'.",
      "A red sparkling wine": "This describes the style, not the sweetness level.",
      "A specific blend of grapes": "This relates to the cuvée, not the sweetness."
    }
  },
  {
    question: "Which of these is NOT a primary noble grape of Alsace, France?",
    options: ["Riesling", "Gewürztraminer", "Chardonnay", "Pinot Gris"],
    correctAnswer: "Chardonnay",
    explanation: "The four noble grapes of Alsace are Riesling, Gewürztraminer, Pinot Gris, and Muscat. Chardonnay is the primary grape of nearby Burgundy and Champagne.",
    wrongAnswerExplanations: {
      "Riesling": "Riesling is one of the most important noble grapes of Alsace.",
      "Gewürztraminer": "Gewürztraminer is a famously aromatic noble grape of Alsace.",
      "Pinot Gris": "Pinot Gris (distinct from Italian Pinot Grigio) is a key noble grape of Alsace."
    }
  },
  {
    question: "The 'Right Bank' of Bordeaux is most famous for wines based on which grape?",
    options: ["Cabernet Sauvignon", "Merlot", "Malbec", "Sauvignon Blanc"],
    correctAnswer: "Merlot",
    explanation: "The Right Bank regions, such as Pomerol and Saint-Émilion, have clay-based soils perfect for Merlot, which dominates their famous blends.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "Cabernet Sauvignon is the king of the 'Left Bank' of Bordeaux, where gravel soils dominate.",
      "Malbec": "While used in Bordeaux, Malbec is a minor blending grape and is more famous in Argentina.",
      "Sauvignon Blanc": "This is a white grape used for the dry and sweet white wines of Bordeaux."
    }
  },
  {
    question: "What is 'carbonic maceration' most famously used for?",
    options: ["Making Port wine", "Aging Chardonnay", "Producing Beaujolais Nouveau", "Making Ice Wine"],
    correctAnswer: "Producing Beaujolais Nouveau",
    explanation: "This technique involves fermenting whole grape clusters in a carbon dioxide-rich environment, which produces the fresh, fruity, low-tannin style of Beaujolais Nouveau.",
    wrongAnswerExplanations: {
      "Making Port wine": "Port is a fortified wine, which involves adding brandy during fermentation.",
      "Aging Chardonnay": "This is a fermentation technique, not an aging method.",
      "Making Ice Wine": "Ice wine is made by pressing grapes that have frozen on the vine."
    }
  },
  {
    question: "A 'corked' wine is contaminated with what compound?",
    options: ["Sulfur Dioxide", "TCA (Trichloroanisole)", "Brettanomyces", "Volatile Acidity"],
    correctAnswer: "TCA (Trichloroanisole)",
    explanation: "TCA is a chemical compound that imparts a musty, moldy smell like wet cardboard or a damp basement, ruining the wine.",
    wrongAnswerExplanations: {
        "Sulfur Dioxide": "While high levels can be a fault (smelling of burnt matches), it's not what 'corked' means.",
        "Brettanomyces": "This is a yeast that can cause aromas of barnyard or band-aids.",
        "Volatile Acidity": "This creates a vinegary smell in wine."
    }
  },
  {
    question: "Which of these describes a wine's 'finish'?",
    options: ["The initial taste on the palate", "The way it looks in the glass", "The lingering taste after you swallow", "The aroma before you sip"],
    correctAnswer: "The lingering taste after you swallow",
    explanation: "The finish, or aftertaste, is the sensation a wine leaves in your mouth after you've swallowed or spit it out. A long, pleasant finish is a sign of a high-quality wine.",
    wrongAnswerExplanations: {
      "The initial taste on the palate": "This is known as the 'attack' or 'entry'.",
      "The way it looks in the glass": "This refers to the wine's appearance or 'legs'.",
      "The aroma before you sip": "This is the wine's 'nose' or 'aroma'."
    }
  },
  {
    question: "What does 'sur lie' aging involve?",
    options: ["Aging wine underwater", "Aging wine with dead yeast cells", "Aging wine in a very cold cellar", "Aging wine in clay pots"],
    correctAnswer: "Aging wine with dead yeast cells",
    explanation: "'Sur lie' is a French phrase that means 'on the lees.' The lees are the dead yeast cells left after fermentation, which can add texture and complexity to the wine.",
    wrongAnswerExplanations: {
      "Aging wine underwater": "While experimental, this is not the meaning of 'sur lie'.",
      "Aging wine in a very cold cellar": "This describes cellar conditions, not a specific technique.",
      "Aging wine in clay pots": "This refers to aging in amphorae, an ancient technique."
    }
  },
  {
    question: "The term 'cuvée' on a wine label refers to what?",
    options: ["The vintage year", "A specific blend of wine", "The vineyard location", "The alcohol content"],
    correctAnswer: "A specific blend of wine",
    explanation: "Cuvée is a French term that refers to a specific blend or batch of wine, often one that a winemaker considers to be of a higher quality.",
    wrongAnswerExplanations: {
      "The vintage year": "Vintage refers to the year the grapes were harvested.",
      "The vineyard location": "This is referred to as the appellation or vineyard designation.",
      "The alcohol content": "This is listed as ABV (Alcohol by Volume) on the label."
    }
  },
  {
    question: "What is 'racking' in the winemaking process?",
    options: ["Storing bottles on a rack", "Turning bottles during aging", "Siphoning wine off its sediment", "Crushing the grapes"],
    correctAnswer: "Siphoning wine off its sediment",
    explanation: "Racking is the process of carefully moving wine from one barrel or tank to another, leaving the sediment (lees) behind to clarify the wine.",
    wrongAnswerExplanations: {
      "Storing bottles on a rack": "This is simply wine storage.",
      "Turning bottles during aging": "This is 'riddling,' a process specific to traditional method sparkling wine.",
      "Crushing the grapes": "This is the initial step of pressing or crushing the grapes to release juice."
    }
  },
  {
    question: "Which of these red grapes is known for having very low tannins?",
    options: ["Cabernet Sauvignon", "Nebbiolo", "Gamay", "Tannat"],
    correctAnswer: "Gamay",
    explanation: "Gamay, the grape of Beaujolais, is known for producing light, fruity red wines with very low levels of tannin, making them easy to drink.",
    wrongAnswerExplanations: {
      "Cabernet Sauvignon": "This grape is famous for its high, firm tannin structure.",
      "Nebbiolo": "This Italian grape, used in Barolo, has famously powerful tannins.",
      "Tannat": "As the name suggests, this grape is known for having some of the highest tannin levels of any variety."
    }
  },
  {
    question: "The 'solera' system is a unique aging and blending process used for which wine?",
    options: ["Port", "Madeira", "Sherry", "Sauternes"],
    correctAnswer: "Sherry",
    explanation: "The solera system is a complex method of fractional blending used in Jerez, Spain, where younger wines are progressively blended with older wines to ensure a consistent style.",
    wrongAnswerExplanations: {
      "Port": "Port is typically aged by vintage or in casks, but not using a solera system.",
      "Madeira": "Madeira is aged using a unique heating process called 'estufagem'.",
      "Sauternes": "Sauternes is aged in barrels but does not use the solera blending system."
    }
  },
  {
    question: "If a wine is described as 'varietal,' what does that mean?",
    options: ["It comes from a specific region", "It is made from a blend of many grapes", "It is made primarily from one type of grape", "It is a sweet wine"],
    correctAnswer: "It is made primarily from one type of grape",
    explanation: "A varietal wine is one that is labeled as being made from a single, dominant grape variety (e.g., 'Merlot' or 'Chardonnay'). In the US, it must contain at least 75% of that grape.",
    wrongAnswerExplanations: {
      "It comes from a specific region": "This refers to the wine's appellation, not its grape composition.",
      "It is made from a blend of many grapes": "This is the opposite; it's a 'blend,' not a 'varietal'.",
      "It is a sweet wine": "A varietal wine can be sweet or dry."
    }
  },
  {
    question: "What does 'Blanc de Blancs' mean on a Champagne label?",
    options: ["White from reds", "A blend of all grapes", "White from whites", "A sweet style"],
    correctAnswer: "White from whites",
    explanation: "'Blanc de Blancs' translates to 'white from whites' and signifies that the Champagne was made 100% from white grapes, which almost always means 100% Chardonnay.",
    wrongAnswerExplanations: {
      "White from reds": "This is called 'Blanc de Noirs,' or 'white from blacks,' made from Pinot Noir and/or Pinot Meunier.",
      "A blend of all grapes": "This describes a standard Champagne cuvée, not a specific style like Blanc de Blancs.",
      "A sweet style": "This refers to the style of grape used, not the sweetness level. A Blanc de Blancs can be dry (Brut) or sweet (Doux)."
    }
  },
  {
    question: "Which of these is a major wine region in Australia?",
    options: ["Marlborough", "Stellenbosch", "Barossa Valley", "Central Otago"],
    correctAnswer: "Barossa Valley",
    explanation: "The Barossa Valley in South Australia is one of the country's most famous wine regions, renowned for its powerful Shiraz.",
    wrongAnswerExplanations: {
      "Marlborough": "Marlborough is the most famous wine region in New Zealand.",
      "Stellenbosch": "Stellenbosch is a premier wine region in South Africa.",
      "Central Otago": "Central Otago is a well-regarded region in New Zealand, known for Pinot Noir."
    }
  },
  {
    question: "A 'punt' in a wine bottle refers to what?",
    options: ["The cork", "The label", "The indentation at the bottom of the bottle", "The neck of the bottle"],
    correctAnswer: "The indentation at the bottom of the bottle",
    explanation: "The punt is the dimple or indentation at the base of a wine bottle. Its original purpose is debated but may have been for stability or strength.",
    wrongAnswerExplanations: {
      "The cork": "The cork is the stopper used to seal the bottle.",
      "The label": "The label contains information about the wine.",
      "The neck of the bottle": "The neck is the narrow part of the bottle leading to the opening."
    }
  },
  {
    question: "Which country is the origin of the Carmenère grape, though it is now most famous in Chile?",
    options: ["Spain", "Italy", "Argentina", "France"],
    correctAnswer: "France",
    explanation: "Carmenère is a Bordeaux grape variety that was thought to be nearly extinct in France. It was rediscovered in Chile, where it had been mistaken for Merlot for many years.",
    wrongAnswerExplanations: {
      "Spain": "Spain's most famous red grape is Tempranillo.",
      "Italy": "Italy is known for grapes like Sangiovese and Nebbiolo.",
      "Argentina": "Argentina's signature red grape is Malbec, which also originated in France."
    }
  },
  {
    question: "What is 'bottle shock' or 'bottle sickness'?",
    options: ["When a wine is too old to drink", "A temporary condition after bottling or shipping", "A type of wine fault from bad corks", "A marketing term for cheap wine"],
    correctAnswer: "A temporary condition after bottling or shipping",
    explanation: "Bottle shock refers to a temporary period where a wine's flavors and aromas are muted or disjointed, often after being agitated during bottling or travel. It usually resolves with a few days or weeks of rest.",
    wrongAnswerExplanations: {
      "When a wine is too old to drink": "An old, over-the-hill wine is described as 'faded' or 'oxidized'.",
      "A type of wine fault from bad corks": "This is known as 'cork taint' or TCA.",
      "A marketing term for cheap wine": "It is a real, temporary phenomenon observed by winemakers and sommeliers."
    }
  },
  {
    question: "Which of these is a key wine region in Washington State?",
    options: ["Willamette Valley", "Columbia Valley", "Finger Lakes", "Paso Robles"],
    correctAnswer: "Columbia Valley",
    explanation: "The Columbia Valley is the largest AVA in Washington State, known for producing a wide variety of high-quality wines, including Riesling, Merlot, and Cabernet Sauvignon.",
    wrongAnswerExplanations: {
      "Willamette Valley": "This is the most famous wine region in Oregon.",
      "Finger Lakes": "This is a prominent wine region in New York State.",
      "Paso Robles": "This is a well-known wine region on California's Central Coast."
    }
  },
  {
    question: "The process of 'riddling' is used in the production of which type of wine?",
    options: ["Ice Wine", "Port", "Traditional Method Sparkling Wine", "Rosé"],
    correctAnswer: "Traditional Method Sparkling Wine",
    explanation: "Riddling is the process of gradually turning and tilting bottles of sparkling wine to collect the yeast sediment in the neck before disgorgement.",
    wrongAnswerExplanations: {
      "Ice Wine": "Ice wine is made from frozen grapes and does not involve riddling.",
      "Port": "Port is a fortified wine and does not undergo this process.",
      "Rosé": "Rosé is a still wine and is not made using the riddling process."
    }
  },
  {
    question: "What is the primary red grape of the Beaujolais region in France?",
    options: ["Pinot Noir", "Syrah", "Cabernet Franc", "Gamay"],
    correctAnswer: "Gamay",
    explanation: "The Gamay grape is responsible for the light-bodied, fruity red wines of Beaujolais, including the famous Beaujolais Nouveau.",
    wrongAnswerExplanations: {
      "Pinot Noir": "Pinot Noir is the grape of Burgundy, which is just north of Beaujolais.",
      "Syrah": "Syrah is the grape of the Northern Rhône Valley.",
      "Cabernet Franc": "Cabernet Franc is a key grape in the Loire Valley and Bordeaux."
    }
  },
  {
    question: "What does the term 'legs' or 'tears' on the inside of a wine glass indicate?",
    options: ["The age of the wine", "The quality of the wine", "The sugar or alcohol content", "The acidity of the wine"],
    correctAnswer: "The sugar or alcohol content",
    explanation: "The 'legs' are droplets that run down the side of the glass, caused by the Marangoni effect. Thicker, slower-moving legs can indicate higher alcohol or residual sugar.",
    wrongAnswerExplanations: {
      "The age of the wine": "Age cannot be determined by looking at the legs.",
      "The quality of the wine": "Legs are not a reliable indicator of a wine's quality.",
      "The acidity of the wine": "Acidity does not cause the formation of legs."
    }
  },
  {
    question: "Which of these is a famous wine region in Germany known for Spätburgunder (Pinot Noir)?",
    options: ["Mosel", "Rheingau", "Baden", "Pfalz"],
    correctAnswer: "Baden",
    explanation: "Baden is Germany's warmest wine region and is particularly well-regarded for its high-quality Spätburgunder (Pinot Noir).",
    wrongAnswerExplanations: {
      "Mosel": "The Mosel is most famous for its world-class Riesling.",
      "Rheingau": "The Rheingau is also primarily known for Riesling.",
      "Pfalz": "Pfalz produces excellent Riesling and a variety of other grapes, but Baden is more famous for Pinot Noir."
    }
  },
  {
    question: "What does 'appellation' mean in the context of wine?",
    options: ["The name of the grape", "The brand name of the winery", "A legally defined geographical area", "The year of harvest"],
    correctAnswer: "A legally defined geographical area",
    explanation: "An appellation is a legally defined and protected geographical indication used to identify where the grapes for a wine were grown, like 'Napa Valley' or 'Bordeaux'.",
    wrongAnswerExplanations: {
      "The name of the grape": "This is the 'variety' or 'varietal'.",
      "The brand name of the winery": "This is the 'producer' or 'brand'.",
      "The year of harvest": "This is the 'vintage'."
    }
  },
  {
    question: "What does 'GSM' refer to in the wine world?",
    options: ["A type of wine bottle size", "A popular red wine blend", "A German quality level", "A system for rating wines"],
    correctAnswer: "A popular red wine blend",
    explanation: "'GSM' stands for Grenache, Syrah, and Mourvèdre, the three grapes that form the basis of the famous red blends from the Southern Rhône Valley.",
    wrongAnswerExplanations: {
      "A type of wine bottle size": "Bottle sizes have names like Magnum, Jeroboam, etc.",
      "A German quality level": "German quality levels include terms like Kabinett and Spätlese.",
      "A system for rating wines": "Rating systems are typically based on a 100-point scale."
    }
  },
  // --- Virginia-Focused Questions ---
  {
    question: "The Virginia Governor's Cup is a prestigious annual wine competition. The collection of the top 12 winning wines is known as what?",
    options: ["The Governor's Dozen", "The Jefferson Collection", "The Commonwealth Chalice", "The Governor's Case"],
    correctAnswer: "The Governor's Case",
    explanation: "The top 12 scoring wines in the competition make up the 'Governor's Case,' with one of them being awarded the overall Governor's Cup trophy.",
    wrongAnswerExplanations: {
      "The Governor's Dozen": "While there are 12 wines, the official name for the collection is the 'Governor's Case'.",
      "The Jefferson Collection": "The Jefferson Cup Invitational is a separate, different wine competition.",
      "The Commonwealth Chalice": "This is not the name of the top prize in the Virginia Governor's Cup."
    }
  },
  {
    question: "What is the largest AVA in Virginia, covering a large swath of the western part of the state?",
    options: ["Monticello AVA", "Shenandoah Valley AVA", "Middleburg AVA", "Northern Neck George Washington Birthplace AVA"],
    correctAnswer: "Shenandoah Valley AVA",
    explanation: "The Shenandoah Valley AVA is Virginia's largest, stretching for over 100 miles along the Blue Ridge and Allegheny Mountains.",
    wrongAnswerExplanations: {
      "Monticello AVA": "This is a famous AVA around Charlottesville but is much smaller than the Shenandoah Valley.",
      "Middleburg AVA": "This is a prominent AVA in Northern Virginia, but it is not the largest.",
      "Northern Neck George Washington Birthplace AVA": "This is a historic AVA but is geographically smaller."
    }
  },
  {
    question: "Which hybrid grape, known for its deep color and disease resistance, is often used for red wines in Virginia?",
    options: ["Vidal Blanc", "Traminette", "Chambourcin", "Seyval Blanc"],
    correctAnswer: "Chambourcin",
    explanation: "Chambourcin is a French-American hybrid grape that grows well in Virginia's humid climate and produces a dark-colored red wine with cherry and earthy notes.",
    wrongAnswerExplanations: {
      "Vidal Blanc": "Vidal Blanc is a white hybrid grape often used for off-dry or dessert wines.",
      "Traminette": "Traminette is an aromatic white hybrid grape with floral notes similar to Gewürztraminer.",
      "Seyval Blanc": "Seyval Blanc is a white hybrid grape that produces crisp, dry white wines."
    }
  },
  {
    question: "Virginia's wine industry often draws parallels to which famous 'Old World' region due to its climate and key grapes?",
    options: ["Tuscany, Italy", "Bordeaux, France", "Rioja, Spain", "Mosel, Germany"],
    correctAnswer: "Bordeaux, France",
    explanation: "With its humid, maritime-influenced climate and success with grapes like Merlot, Cabernet Franc, and Petit Verdot, Virginia is often compared to Bordeaux.",
    wrongAnswerExplanations: {
      "Tuscany, Italy": "Tuscany's climate is much drier and Mediterranean, and its key grape is Sangiovese.",
      "Rioja, Spain": "Rioja has a different climate and its signature grape is Tempranillo.",
      "Mosel, Germany": "The Mosel has a cool continental climate and is famous for Riesling."
    }
  },
  {
    question: "Which Virginia AVA is one of the state's oldest and is located on a peninsula?",
    options: ["Middleburg AVA", "Shenandoah Valley AVA", "Northern Neck George Washington Birthplace AVA", "Rocky Knob AVA"],
    correctAnswer: "Northern Neck George Washington Birthplace AVA",
    explanation: "Established in 1987, this AVA is located on the Northern Neck peninsula and is one of Virginia's first federally recognized wine regions.",
    wrongAnswerExplanations: {
      "Middleburg AVA": "This is in Northern Virginia but was established much later, in 2012.",
      "Shenandoah Valley AVA": "This is a large AVA in western Virginia, not on a peninsula.",
      "Rocky Knob AVA": "Located in the Blue Ridge Mountains, this was one of the first AVAs but is not on a peninsula."
    }
  },
  {
    question: "The 'October Virginia Wine Month' celebrates what?",
    options: ["The start of the growing season", "The peak of the harvest season", "The release of new sparkling wines", "A historical event in Virginia"],
    correctAnswer: "The peak of the harvest season",
    explanation: "October is designated as Virginia Wine Month because it coincides with the height of the grape harvest season, a time of celebration and activity at wineries.",
    wrongAnswerExplanations: {
      "The start of the growing season": "The growing season begins in the spring with bud break.",
      "The release of new sparkling wines": "Wine releases happen throughout the year and are not tied to a specific month-long celebration.",
      "A historical event in Virginia": "It celebrates the current harvest, not a specific past event."
    }
  },
  {
    question: "Which of these is a wine region in Northern Virginia known for its scenic beauty and numerous wineries?",
    options: ["The Finger Lakes", "Loudoun County", "The Willamette Valley", "Shenandoah County"],
    correctAnswer: "Loudoun County",
    explanation: "Loudoun County, often called 'DC's Wine Country,' is home to over 40 wineries and is a major center for wine tourism in Virginia.",
    wrongAnswerExplanations: {
      "The Finger Lakes": "This is a major wine region in New York State.",
      "The Willamette Valley": "This is Oregon's most famous wine region.",
      "Shenandoah County": "While part of the larger Shenandoah Valley AVA, Loudoun County is more distinctly known as the heart of Northern Virginia's wine scene."
    }
  },
  {
    question: "A 'Meritage' wine from Virginia is a blend of which type of grapes?",
    options: ["Rhône varieties (Syrah, Grenache)", "Italian varieties (Sangiovese, Nebbiolo)", "Bordeaux varieties (Cabernet, Merlot)", "German varieties (Riesling, Gewürztraminer)"],
    correctAnswer: "Bordeaux varieties (Cabernet, Merlot)",
    explanation: "Meritage is a term for American wines made in the style of a Bordeaux blend, using grapes like Cabernet Sauvignon, Merlot, Cabernet Franc, and Petit Verdot.",
    wrongAnswerExplanations: {
      "Rhône varieties (Syrah, Grenache)": "A blend of these grapes would be called a Rhône-style blend, not a Meritage.",
      "Italian varieties (Sangiovese, Nebbiolo)": "These grapes are used in Italian wines like Chianti and Barolo.",
      "German varieties (Riesling, Gewürztraminer)": "These are white grapes and are not used in a Meritage blend."
    }
  },
  {
    question: "Which historic figure is considered the 'Father of American Viticulture' for his early efforts at Monticello?",
    options: ["George Washington", "James Monroe", "Thomas Jefferson", "Patrick Henry"],
    correctAnswer: "Thomas Jefferson",
    explanation: "Thomas Jefferson was a passionate advocate for viticulture and attempted to cultivate European grapevines in Virginia long before it was commercially viable.",
    wrongAnswerExplanations: {
        "George Washington": "Washington experimented with many crops at Mount Vernon but is not as famously linked to wine as Jefferson.",
        "James Monroe": "While a contemporary of Jefferson, Monroe is not known for viticulture.",
        "Patrick Henry": "Patrick Henry was a statesman and orator, not a known viticulturist."
    }
  },
  {
    question: "What is a common characteristic of Virginia Petit Verdot?",
    options: ["Light body and color", "Low tannins and high acidity", "Deep color, full body, and firm tannins", "Sweet with floral aromas"],
    correctAnswer: "Deep color, full body, and firm tannins",
    explanation: "Petit Verdot, traditionally a minor blending grape in Bordeaux, excels in Virginia as a single-varietal wine known for its power and structure.",
     wrongAnswerExplanations: {
        "Light body and color": "This describes wines like Pinot Noir, the opposite of Petit Verdot.",
        "Low tannins and high acidity": "Petit Verdot is known for having high, not low, tannins.",
        "Sweet with floral aromas": "This describes a dessert wine like Moscato; Petit Verdot is a dry, bold red."
    }
  },
  {
    question: "Which Virginia winery is known for its stunning location on a high-elevation mountain pass in Northern Virginia?",
    options: ["Barboursville Vineyards", "King Family Vineyards", "Bluemont Vineyard", "Chateau Morrisette"],
    correctAnswer: "Bluemont Vineyard",
    explanation: "Bluemont Vineyard in Northern Virginia is situated at 951 feet elevation on an eastern slope of the Blue Ridge Mountains, offering panoramic views.",
    wrongAnswerExplanations: {
        "Barboursville Vineyards": "Barboursville is known for its historic ruins and is not at a high mountain elevation.",
        "King Family Vineyards": "King Family is famous for its polo matches and scenic but not high-elevation setting.",
        "Chateau Morrisette": "This is a well-known winery on the Blue Ridge Parkway, but located in Southern Virginia."
    }
  },
  {
    question: "What is the name of the annual event where the best Virginia wines are judged and awarded?",
    options: ["The Virginia State Fair Wine Competition", "The Monticello Cup", "The Virginia Governor's Cup", "The Commonwealth Wine Classic"],
    correctAnswer: "The Virginia Governor's Cup",
    explanation: "The Virginia Governor's Cup is the state's most stringent wine competition, resulting in the selection of the prestigious Governor's Case.",
    wrongAnswerExplanations: {
      "The Virginia State Fair Wine Competition": "The State Fair has a competition, but the Governor's Cup is the most prestigious.",
      "The Monticello Cup": "The Monticello Wine Trail has its own awards, but this is not the statewide competition.",
      "The Commonwealth Wine Classic": "This is not the name of a major Virginia wine competition."
    }
  },
  {
    question: "Which insect pest, native to Asia, poses a significant threat to Virginia vineyards by damaging grapes and vines?",
    options: ["Spotted Lanternfly", "Japanese Beetle", "Glassy-winged Sharpshooter", "Grape Berry Moth"],
    correctAnswer: "Spotted Lanternfly",
    explanation: "The invasive Spotted Lanternfly has become a major concern for Virginia's agricultural industries, including vineyards, as it feeds on and damages grapevines.",
    wrongAnswerExplanations: {
      "Japanese Beetle": "While a pest, the Spotted Lanternfly is a more recent and significant threat.",
      "Glassy-winged Sharpshooter": "This pest is a major issue in California as a vector for Pierce's Disease, but less so in Virginia.",
      "Grape Berry Moth": "This is a common vineyard pest, but the Spotted Lanternfly is a more severe invasive threat."
    }
  },
  {
    question: "What does a 'Gold Medal' from the Virginia Governor's Cup signify?",
    options: ["The wine is affordable", "The wine is a best-seller", "The wine meets a high standard of quality", "The wine is made from 100% Virginia grapes"],
    correctAnswer: "The wine meets a high standard of quality",
    explanation: "A Gold Medal is awarded to wines that score 90 points or higher on a 100-point scale by a panel of esteemed judges, indicating exceptional quality.",
    wrongAnswerExplanations: {
      "The wine is affordable": "Price is not a factor in the judging.",
      "The wine is a best-seller": "Sales volume has no bearing on the competition.",
      "The wine is made from 100% Virginia grapes": "While this is a requirement to enter, the medal itself signifies quality, not just origin."
    }
  },
  {
    question: "True or False: All wineries in Virginia are required to be part of an AVA.",
    options: ["True", "False"],
    correctAnswer: "False",
    explanation: "While many wineries are located within an AVA, it is not a requirement. A winery can exist outside of an AVA's boundaries and label its wine with the broader 'Virginia' appellation.",
    wrongAnswerExplanations: {
      "True": "Wineries can be located anywhere in the state, and being within an AVA is not mandatory for operation."
    }
  }
];

// --- HELPER FUNCTIONS ---
// Enhanced shuffle algorithm to ensure better randomization
const shuffleArray = (array) => {
  const shuffled = array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  return shuffled;
};

const getTenRandomQuestions = () => {
  return shuffleArray([...WINE_QUIZ_QUESTIONS]).slice(0, 10);
};

const generateGameCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// --- FIREBASE INITIALIZATION (RUNS ONCE) ---
let firebaseConfig;
let appId;

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  appId = String(rawAppId).replace(/[^a-zA-Z0-9_-]/g, '_');
} else {
  firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  appId = firebaseConfig.projectId;
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug');


// --- MAIN APP COMPONENT ---
export default function App() {
  // Global App State
  const [mode, setMode] = useState('loading'); // loading, enterName, lobby, game
  const [error, setError] = useState('');
  
  // User & Auth State
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Game State
  const [gameId, setGameId] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [gameData, setGameData] = useState(null);
  const [isLoadingGame, setIsLoadingGame] = useState(false);

  // Memoized values derived from gameData for performance
  const isProctor = useMemo(() => gameData?.hostId === userId, [gameData, userId]);
  const currentPlayer = useMemo(() => gameData?.players?.find(p => p.id === userId), [gameData, userId]);
  
  // Authentication Effect
  useEffect(() => {
    try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
            setMode('enterName');
          } else {
             const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
             if (token) {
                 await signInWithCustomToken(auth, token);
             } else {
                 await signInAnonymously(auth);
             }
          }
        });
        return () => unsubscribe();
    } catch (e) {
        console.error("Firebase Auth Error:", e);
        setError("Could not authenticate. Please refresh.");
        setMode('error');
    }
  }, []);

  // Firestore Real-time Game Listener
  useEffect(() => {
    if (!gameId || !isAuthReady || !appId) return;
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      setIsLoadingGame(false);
      if (docSnap.exists()) {
        setGameData(docSnap.data());
        setMode('game');
      } else {
        setError(`Game "${gameId}" does not exist.`);
        setGameId('');
        setGameData(null);
        setMode('lobby');
      }
    }, (err) => {
      console.error("Firestore Snapshot Error:", err);
      setError("Lost connection to the game.");
      setIsLoadingGame(false);
    });
    return () => unsubscribe();
  }, [gameId, isAuthReady]);

  // --- HANDLER FUNCTIONS ---
  const handleSetName = () => {
    const trimmedName = nameInput.trim();
    if (trimmedName.length < 2) {
      setError("Please enter a name with at least 2 characters.");
      return;
    }
    setError('');
    setUserName(trimmedName);
    setMode('lobby');
  };
  
  const handleCreateGame = async () => {
    if (!isAuthReady || !userId || !userName) {
      setError("Authentication not complete or name not set. Please wait.");
      return;
    }
    setIsLoadingGame(true);
    setError('');
    const newGameId = generateGameCode();
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId);
    const newGameData = {
      hostId: userId,
      hostName: userName,
      createdAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      questions: getTenRandomQuestions(),
      revealAnswers: false,
      quizEnded: false,
      players: [], // Proctor is not a player
    };
    try {
      await setDoc(gameDocRef, newGameData);
      setGameId(newGameId);
    } catch (e) {
      console.error("Create Game Error:", e);
      setError("Failed to create game. Please check permissions and try again.");
      setIsLoadingGame(false);
    }
  };

  const handleJoinGame = async () => {
    const code = gameIdInput.trim().toUpperCase();
    if (code.length !== 4) {
      setError("Please enter a valid 4-letter game code.");
      return;
    }
    setIsLoadingGame(true);
    setError('');
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', code);
    try {
        const docSnap = await getDoc(gameDocRef);
        if (docSnap.exists()) {
            const game = docSnap.data();
            // If the user is the host, let them rejoin without adding to players list
            if (game.hostId === userId) {
                setGameId(code);
                return;
            }
            // If player is not already in the game, add them
            if (!game.players.some(p => p.id === userId)) {
                const newPlayer = { id: userId, name: userName, score: 0, selectedAnswer: null };
                await updateDoc(gameDocRef, { players: [...game.players, newPlayer] });
            }
            setGameId(code);
        } else {
            setError(`Game "${code}" not found.`);
            setIsLoadingGame(false);
        }
    } catch (e) {
        console.error("Join Game Error:", e);
        setError("Could not join game. Please check the code and connection.");
        setIsLoadingGame(false);
    }
  };

  const handleSelectAnswer = async (option) => {
    // Proctors cannot select answers
    if (isProctor || gameData?.revealAnswers || gameData?.quizEnded) return;

    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const updatedPlayers = gameData.players.map(p => p.id === userId ? { ...p, selectedAnswer: option } : p);
    try {
      await updateDoc(gameDocRef, { players: updatedPlayers });
    } catch (e) { console.error("Select Answer Error:", e); setError("Could not submit answer."); }
  };
  
  const handleReveal = async () => {
    if (!isProctor) return;
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const updatedPlayers = gameData.players.map(p => ({ ...p, score: p.score + (p.selectedAnswer === currentQuestion.correctAnswer ? 1 : 0) }));
    try {
        await updateDoc(gameDocRef, { players: updatedPlayers, revealAnswers: true });
    } catch (e) { console.error("Reveal Error:", e); setError("Could not reveal answers."); }
  };
  
  const handleNextQuestion = async () => {
    if (!isProctor) return;
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const nextIndex = gameData.currentQuestionIndex + 1;
    if (nextIndex < gameData.questions.length) {
        const updatedPlayers = gameData.players.map(p => ({ ...p, selectedAnswer: null }));
        try {
            await updateDoc(gameDocRef, { currentQuestionIndex: nextIndex, revealAnswers: false, players: updatedPlayers });
        } catch(e) { console.error("Next Question Error:", e); setError("Could not advance."); }
    } else {
        try {
            await updateDoc(gameDocRef, { quizEnded: true, revealAnswers: true });
        } catch(e) { console.error("End Quiz Error:", e); setError("Could not end quiz."); }
    }
  };

  const handleLeaveGame = () => {
      setGameId(''); setGameData(null); setGameIdInput(''); setError(''); setMode('lobby');
  };

  // --- RENDER LOGIC ---
  const renderContent = () => {
    switch (mode) {
      case 'loading':
        return <div className="text-center"><p className="text-lg text-gray-400 animate-pulse">Connecting to the Vineyard...</p></div>;
      
      case 'error':
        return <div className="text-center p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md"><p className="font-bold">An Error Occurred</p><p>{error}</p></div>;
        
      case 'enterName':
        return (
          <div className="w-full max-w-sm mx-auto text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 font-heading mb-4">Welcome, Connoisseur!</h2>
            <p className="text-gray-500 mb-6">Please enter your name to begin.</p>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <input
              type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSetName()}
              placeholder="Your Name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-mauve transition"
            />
            <button
              onClick={handleSetName}
              className="w-full mt-4 bg-mauve text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-dark-green transition-transform transform hover:scale-105"
            >
              Let's Begin!
            </button>
          </div>
        );

      case 'lobby':
        return (
          <div className="w-full max-w-md mx-auto text-center animate-fade-in">
            <h2 className="text-3xl font-heading font-bold text-gray-800 mb-2">Join the Challenge</h2>
            <p className="text-gray-500 mb-8">Welcome, <span className="font-bold text-mauve">{userName}</span>!</p>
            
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="bg-white/50 p-6 rounded-xl shadow-md mb-6 border border-gray-200">
              <h3 className="text-xl font-heading font-semibold text-gray-700 mb-4">Join a Game</h3>
              <input
                type="text" value={gameIdInput} onChange={(e) => setGameIdInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                placeholder="4-LETTER CODE" maxLength={4}
                className="w-full px-4 py-3 text-center tracking-widest font-mono text-xl border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-light-green transition"
              />
              <button
                onClick={handleJoinGame} disabled={isLoadingGame}
                className="w-full mt-4 bg-light-green text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-dark-green transition-transform transform hover:scale-105 disabled:opacity-50"
              >
                {isLoadingGame ? 'Joining...' : 'Join Game'}
              </button>
            </div>
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-stone-100 text-sm font-medium text-gray-500 rounded-full">OR</span></div>
            </div>

            <button
              onClick={handleCreateGame} disabled={isLoadingGame || !isAuthReady} 
              className="w-full bg-mauve text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-dark-green transition-transform transform hover:scale-105 disabled:opacity-50"
            >
              {isLoadingGame ? 'Creating...' : 'Create New Game (as Proctor)'}
            </button>
             <button onClick={() => setMode('enterName')} className="mt-8 text-sm text-gray-500 hover:text-mauve transition">Change Name</button>
          </div>
        );
        
      case 'game':
        if (isLoadingGame || !gameData) {
            return <div className="text-center"><p className="text-lg text-gray-400 animate-pulse">Loading Game...</p></div>;
        }
        
        const { questions, currentQuestionIndex, players, revealAnswers, quizEnded, hostName } = gameData;
        const currentQuestion = questions[currentQuestionIndex];

        const PlayerCard = ({ option }) => {
            const isSelectedByMe = currentPlayer?.selectedAnswer === option;
            let cardStyle = 'bg-white/80 hover:bg-stone-50 border-gray-300/80';

            if (isProctor && !revealAnswers) { // Proctor's pre-reveal view
                if (option === currentQuestion.correctAnswer) {
                    cardStyle = 'bg-green-100/90 border-green-400 ring-2 ring-green-300';
                } else {
                    cardStyle = 'bg-white/70 border-gray-300/80';
                }
            } else if (revealAnswers) { // Post-reveal for everyone
                if (option === currentQuestion.correctAnswer) {
                    cardStyle = 'bg-green-200/80 border-green-500 ring-2 ring-green-500 transform scale-105 shadow-lg';
                } else if (isSelectedByMe) {
                    cardStyle = 'bg-red-200/80 border-red-500 opacity-70';
                } else {
                    cardStyle = 'bg-stone-100/80 border-gray-200/80 opacity-60';
                }
            } else if (isSelectedByMe) { // Player's pre-reveal view
                cardStyle = 'bg-blue-200/80 border-blue-500 ring-2 ring-blue-500 shadow-lg';
            }
            
            return (
                <button
                    onClick={() => handleSelectAnswer(option)}
                    disabled={revealAnswers || quizEnded || isProctor}
                    className={`p-4 rounded-xl shadow-md border text-left w-full transition-all duration-300 ${cardStyle}`}
                >
                    <p className="font-semibold text-lg text-gray-800">{option}</p>
                </button>
            );
        };
        
        const ProctorQuestionControls = () => {
            if (!isProctor) return null;
            const answeredCount = players.filter(p => p.selectedAnswer !== null).length;
            return (
                <div className="mt-6 space-y-3">
                    <div className="p-3 bg-stone-100/80 rounded-lg text-center">
                        <p className="text-sm font-semibold text-gray-700">{answeredCount} of {players.length} players have answered.</p>
                    </div>
                    {!revealAnswers ? (
                        <button onClick={handleReveal} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg shadow-md hover:bg-yellow-500 transition-transform transform hover:scale-105">Reveal Answer</button>
                    ) : (
                        <button onClick={handleNextQuestion} className="w-full bg-mauve text-white font-bold py-3 rounded-lg shadow-md hover:bg-darkest-green transition-transform transform hover:scale-105">Next Question</button>
                    )}
                </div>
            );
        }

        return (
          <div className="w-full max-w-md mx-auto flex flex-col gap-6 animate-fade-in">
             <header className="text-center relative pt-4">
                <h2 className="text-2xl font-bold text-gray-700 font-heading">Game Code: <span className="font-mono text-mauve tracking-widest">{gameId}</span></h2>
                <p className="text-gray-500">Proctor: <span className="font-semibold">{hostName}</span></p>
                 <button onClick={handleLeaveGame} className="absolute top-0 right-0 text-xs font-bold text-red-500 hover:text-red-700 transition-colors p-2">
                    Leave 🚪
                </button>
             </header>

            {quizEnded ? (
                <div className="text-center bg-white/80 p-6 rounded-xl shadow-xl animate-fade-in backdrop-blur-sm">
                    <h3 className="text-3xl font-extrabold text-gray-800 font-heading mb-4">Challenge Complete!</h3>
                    <p className="text-lg text-gray-500 mb-6">Final Scores:</p>
                    <ul className="space-y-3">
                        {[...players].sort((a,b) => b.score - a.score).map((p, index) => (
                           <li key={p.id} className={`flex justify-between items-center p-3 rounded-lg shadow-inner text-left ${index === 0 ? 'bg-yellow-100/80 border border-yellow-300' : 'bg-stone-50/80'}`}>
                                <p className="font-bold text-lg text-gray-800">{index === 0 ? '🏆' : `${index + 1}.`} {p.name}</p>
                                <p className="font-bold text-xl text-mauve">{p.score}</p>
                           </li>
                        ))}
                    </ul>
                    {isProctor && (
                        <button onClick={handleCreateGame} className="w-full mt-8 bg-mauve text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-dark-green transition-transform transform hover:scale-105">
                            Start a New Game
                        </button>
                    )}
                </div>
            ) : (
              <>
                <div className="bg-white/80 p-6 rounded-xl shadow-xl backdrop-blur-sm">
                    <p className="font-semibold text-mauve mb-2 font-heading text-center">Question {currentQuestionIndex + 1} of {10}</p>
                    <h3 className="text-2xl font-bold text-gray-800 font-heading mb-6 text-center">{currentQuestion.question}</h3>
                    <div className="space-y-3">
                        {currentQuestion.options.map(opt => <PlayerCard key={opt} option={opt} />)}
                    </div>
                    
                    <ProctorQuestionControls />

                    {revealAnswers && (
                        <div className="mt-6 p-4 bg-green-50/80 border-l-4 border-green-500 animate-fade-in">
                            <h4 className="font-bold text-green-800 font-heading">Explanation</h4>
                            <p className="text-green-700 mt-1">{currentQuestion.explanation}</p>
                        </div>
                     )}

                     {!isProctor && !revealAnswers && currentPlayer?.selectedAnswer && (
                          <div className="mt-6 p-3 bg-blue-50/80 border-l-4 border-blue-500 text-center animate-fade-in">
                              <p className="font-semibold text-blue-800 text-sm">Your answer is in! You can change it until the proctor reveals the answer.</p>
                          </div>
                     )}
                </div>

                <div className="bg-white/80 p-6 rounded-xl shadow-xl backdrop-blur-sm">
                    <h4 className="font-bold text-xl text-gray-800 font-heading mb-4 text-center">Scoreboard</h4>
                    <ul className="space-y-3">
                        {players.map(p => (
                            <li key={p.id} className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                                <p className="font-semibold text-gray-700">{p.name}</p>
                                <p className="font-bold text-xl text-mauve">{p.score}</p>
                            </li>
                        ))}
                         {players.length === 0 && <p className="text-center text-gray-500">Waiting for players to join...</p>}
                    </ul>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-body antialiased relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6b2a58]/20 via-transparent to-[#9CAC3E]/20 z-0"></div>
        
      <div className="w-full max-w-7xl mx-auto relative z-10">
        <header className="bg-dark-green text-white py-4 shadow-2xl rounded-t-2xl">
            <div className="max-w-7xl mx-auto flex justify-center items-center">
                 <a href="https://vineyardvoyages.com" target="_blank" rel="noopener noreferrer" className="inline-block">
                    <img src="https://vineyardvoyages.com/wp-content/uploads/2024/08/Group-10123.png" alt="Vineyard Voyages Logo" className="h-16 md:h-20 transition-transform transform hover:scale-110 duration-300" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/240x80/496E3E/ffffff?text=Vineyard+Voyages"; }}/>
                </a>
            </div>
        </header>

        <main className="bg-white/60 backdrop-blur-md rounded-b-2xl shadow-2xl p-4 sm:p-8 border-x border-b border-white/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 text-mauve/5 opacity-50 text-[8rem] transform -rotate-12 pointer-events-none z-0">
                🍇
            </div>
            <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-light-green/5 opacity-50 text-[8rem] transform rotate-12 pointer-events-none z-0">
                🍷
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight font-heading text-center mb-8 relative">
                Connoisseur Challenge
            </h1>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

