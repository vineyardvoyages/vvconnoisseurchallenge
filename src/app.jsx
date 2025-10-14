import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, setLogLevel } from 'firebase/firestore';

// --- WINE QUIZ QUESTIONS BANK ---
// PASTE YOUR FULL ARRAY OF 100 QUESTIONS HERE
// Ensure each question object follows this format:
// {
//   question: "Your question here?",
//   options: ["Option 1", "Option 2", "Option 3", "Option 4"],
//   correctAnswer: "The correct option text",
//   explanation: "Why the correct answer is right.",
//   wrongAnswerExplanations: {
//     "Wrong Option 1": "Explanation for why this is wrong.",
//     "Wrong Option 2": "Explanation for why this is wrong.",
//     "Wrong Option 3": "Explanation for why this is wrong."
//   }
// }
const WINE_QUIZ_QUESTIONS = [
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
    question: "What is the process of aging wine in oak barrels called?",
    options: ["Fermentation", "Malolactic fermentation", "Oaking", "Racking"],
    correctAnswer: "Oaking",
    explanation: "Oaking is the term for aging wine in oak barrels, which can impart flavors like vanilla, spice, and toast.",
    wrongAnswerExplanations: {
      "Fermentation": "Fermentation is the conversion of sugar to alcohol, not the aging process.",
      "Malolactic fermentation": "This is a secondary fermentation that converts malic acid to lactic acid.",
      "Racking": "Racking is the process of transferring wine from one container to another to separate it from sediment."
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
    question: "What is a 'Proctor'?",
    options: ["A winemaker", "A wine critic", "A trained and knowledgeable wine professional", "A wine seller"],
    correctAnswer: "A trained and knowledgeable wine professional",
    explanation: "A Proctor is a highly trained and knowledgeable wine professional, typically working in fine dining restaurants, now serving as the moderator.",
    wrongAnswerExplanations: {
      "A winemaker": "A winemaker produces wine, while a Proctor is more focused on service and education.",
      "A wine critic": "A wine critic evaluates and reviews wines professionally, which is different from a Proctor's role.",
      "A wine seller": "A wine seller focuses on sales, while a Proctor provides expertise and guidance in service."
    }
  },
  {
    question: "Which of these is a sweet, fortified wine from Portugal?",
    options: ["Sherry", "Port", "Madeira", "Marsala"],
    correctAnswer: "Port",
    explanation: "Port is a sweet, fortified wine produced in the Douro Valley of northern Portugal.",
    wrongAnswerExplanations: {
      "Sherry": "Sherry is a fortified wine from Spain, not Portugal.",
      "Madeira": "While Madeira is from Portuguese territory (Madeira Island), Port is the more commonly known Portuguese fortified wine.",
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
    question: "Which grape varietal is the most widely planted in the world?",
    options: ["Merlot", "Airén", "Cabernet Sauvignon", "Chardonnay"],
    correctAnswer: "Airén",
    explanation: "While Cabernet Sauvignon and Merlot are very popular, Airén, a white grape primarily grown in Spain, historically holds the title for most widely planted by area.",
    wrongAnswerExplanations: {
      "Merlot": "Merlot is widely planted but not the most extensive by vineyard area.",
      "Cabernet Sauvignon": "Cabernet Sauvignon is popular globally but doesn't have the largest vineyard area.",
      "Chardonnay": "Chardonnay is widely planted but has less total vineyard area than Airén."
    }
  },
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
  },
// --- HELPER FUNCTIONS ---
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
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
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const appId = String(rawAppId).replace(/[^a-zA-Z0-9_-]/g, '_');

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
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
    if (!gameId || !isAuthReady) return;
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
      players: [{ id: userId, name: userName, score: 0, selectedAnswer: null }],
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
    if (gameData?.revealAnswers || gameData?.quizEnded) return;

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
            <p className="text-gray-500 mb-6">Please enter your name to begin the challenge.</p>
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
            <h2 className="text-3xl font-heading font-bold text-gray-800 mb-2">Multiplayer Lobby</h2>
            <p className="text-gray-500 mb-8">Welcome, <span className="font-bold text-mauve">{userName}</span>!</p>
            
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="bg-white/50 p-6 rounded-xl shadow-md mb-6 border border-gray-200">
              <h3 className="text-xl font-heading font-semibold text-gray-700 mb-4">Join an Existing Game</h3>
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
        const answeredCount = players.filter(p => p.selectedAnswer !== null).length;

        const PlayerCard = ({ option }) => {
            const isSelectedByMe = currentPlayer?.selectedAnswer === option;
            let cardStyle = 'bg-white/80 hover:bg-stone-50 border-gray-300/80';
            if (revealAnswers) {
                if (option === currentQuestion.correctAnswer) {
                    cardStyle = 'bg-green-200/80 border-green-500 ring-2 ring-green-500 transform scale-105 shadow-lg';
                } else if (isSelectedByMe) {
                    cardStyle = 'bg-red-200/80 border-red-500 opacity-70';
                } else {
                    cardStyle = 'bg-stone-100/80 border-gray-200/80 opacity-60';
                }
            } else if (isSelectedByMe) {
                cardStyle = 'bg-blue-200/80 border-blue-500 ring-2 ring-blue-500 shadow-lg';
            }
            return (
                <button
                    onClick={() => handleSelectAnswer(option)}
                    disabled={revealAnswers || quizEnded}
                    className={`p-4 rounded-xl shadow-md border text-left w-full transition-all duration-300 ${cardStyle}`}
                >
                    <p className="font-semibold text-lg text-gray-800">{option}</p>
                </button>
            );
        };

        return (
          <div className="w-full max-w-6xl mx-auto animate-fade-in">
             <header className="mb-6 pb-4 border-b border-gray-200/80">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 font-heading">Game Code: <span className="font-mono text-mauve tracking-widest">{gameId}</span></h2>
                        <p className="text-gray-500">Proctor: <span className="font-semibold">{hostName}</span></p>
                    </div>
                    <button onClick={handleLeaveGame} className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">Leave Game</button>
                </div>
                 {isProctor && <p className="mt-2 text-xs font-semibold text-center bg-mauve text-white px-3 py-1 rounded-full inline-block shadow-sm uppercase tracking-wider">You are the Proctor</p>}
             </header>

            {quizEnded ? (
                <div className="text-center bg-white/80 p-8 rounded-xl shadow-xl animate-fade-in backdrop-blur-sm">
                    <h3 className="text-4xl font-extrabold text-gray-800 font-heading mb-4">Challenge Complete!</h3>
                    <p className="text-xl text-gray-500 mb-8">Final Scores:</p>
                    <ul className="space-y-3 max-w-md mx-auto">
                        {[...players].sort((a,b) => b.score - a.score).map((p, index) => (
                           <li key={p.id} className={`flex justify-between items-center p-4 rounded-lg shadow-inner ${index === 0 ? 'bg-yellow-100/80 border border-yellow-300' : 'bg-stone-50/80'}`}>
                                <p className="font-bold text-lg text-gray-800">{index === 0 ? '🏆' : ''} {p.name}</p>
                                <p className="font-bold text-2xl text-mauve">{p.score}</p>
                           </li>
                        ))}
                    </ul>
                    {isProctor && (
                        <button onClick={handleCreateGame} className="mt-10 bg-mauve text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-dark-green transition-transform transform hover:scale-105">
                            Start a New Game
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white/80 p-8 rounded-xl shadow-xl backdrop-blur-sm">
                        <p className="font-semibold text-mauve mb-2 font-heading">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <h3 className="text-3xl font-bold text-gray-800 font-heading mb-8">{currentQuestion.question}</h3>
                        <div className="space-y-4">
                            {currentQuestion.options.map(opt => <PlayerCard key={opt} option={opt} />)}
                        </div>
                        
                        {revealAnswers && (
                            <div className="mt-8 p-4 bg-green-50/80 border-l-4 border-green-500 animate-fade-in">
                                <h4 className="font-bold text-green-800 font-heading">Explanation</h4>
                                <p className="text-green-700 mt-1">{currentQuestion.explanation}</p>
                                 { currentPlayer?.selectedAnswer && currentPlayer.selectedAnswer !== currentQuestion.correctAnswer && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <h5 className="font-bold text-red-800">Why your answer was incorrect:</h5>
                                        <p className="text-red-700">{currentQuestion.wrongAnswerExplanations[currentPlayer.selectedAnswer]}</p>
                                    </div>
                                )}
                            </div>
                         )}

                         {!revealAnswers && currentPlayer?.selectedAnswer && (
                              <div className="mt-8 p-4 bg-blue-50/80 border-l-4 border-blue-500 text-center animate-fade-in">
                                  <p className="font-semibold text-blue-800">Your answer has been submitted! You can change it until the proctor reveals the correct answer.</p>
                              </div>
                         )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/80 p-6 rounded-xl shadow-xl backdrop-blur-sm">
                            <h4 className="font-bold text-xl text-gray-800 font-heading mb-4">Scoreboard</h4>
                            <ul className="space-y-3">
                                {players.map(p => (
                                    <li key={p.id} className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                                        <p className="font-semibold text-gray-700">{p.name} {p.id === userId && '(You)'}</p>
                                        <p className="font-bold text-xl text-mauve">{p.score}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {isProctor && (
                             <div className="bg-white/80 p-6 rounded-xl shadow-xl space-y-4 sticky top-6 backdrop-blur-sm">
                                <h4 className="font-bold text-xl text-gray-800 font-heading mb-3">Proctor Controls</h4>
                                <div className="p-3 bg-stone-100/80 rounded-lg text-center">
                                    <p className="text-sm font-semibold text-gray-700">{answeredCount} of {players.length} players have answered.</p>
                                </div>
                                {!revealAnswers ? (
                                    <button onClick={handleReveal} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg shadow-md hover:bg-yellow-500 transition-transform transform hover:scale-105">Reveal Answer</button>
                                ) : (
                                    <button onClick={handleNextQuestion} className="w-full bg-mauve text-white font-bold py-3 rounded-lg shadow-md hover:bg-darkest-green transition-transform transform hover:scale-105">Next Question</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
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
        
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Lato:wght@400;700&display=swap');
            body { background-color: #f5f5f4; }
            .font-heading { font-family: 'Playfair Display', serif; }
            .font-body { font-family: 'Lato', sans-serif; }
            .bg-mauve { background-color: #6b2a58; }
            .text-mauve { color: #6b2a58; }
            .ring-mauve { --tw-ring-color: #6b2a58; }
            .border-mauve { border-color: #6b2a58; }
            .bg-light-green { background-color: #9CAC3E; }
            .text-light-green { color: #9CAC3E; }
            .ring-light-green { --tw-ring-color: #9CAC3E; }
            .border-light-green { border-color: #9CAC3E; }
            .bg-dark-green { background-color: #496E3E; }
            .bg-darkest-green { background-color: #486D3E; }
            .animate-fade-in { animation: fadeIn 0.6s ease-in-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
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

