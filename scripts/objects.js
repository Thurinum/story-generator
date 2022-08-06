//**//SCENARIO STRINGS//**//
const scenarioStrings = {
	timeDawn: [
		`and the sun was slowly rising.`,
		`and slowly the sun was rising.`,
		`and the sun, majestuous orb in the sky, was slowly rising.`
	],
	timeDusk: [
		`and the sun was slowly disappearing on the horizon.`,
		`and slowly the sun was disappearing on the horizon.`,
		`and slowly the day was coming to an end.`,
	],
	timeNight: [
		`and the moon was glimmering in the night sky.`,
		`and the night was pitch black.`,
		`and even the moon was struggling to dissipate the darkness of the night.`,
		`and even the Moon had been swallowed by darkness.`,
		`but the moonlight rays lit the ${locationDetails1} ${location} where ${protagonist} stood.`,
		`and it was very dark, for the moon was hidden behind a thick layer of clouds.`,
	],
	seasonSpring: [
		`The plants were slowly starting to appear over the melting snow.`,
		`The flowers, once burried under the snow, were now starting to blossom again.`,
	],
	seasonSummer: [
		`The summmer heat was underwhelming.`,
	],
	seasonFall: [
		`Dead leaves were falling all over on the ground.`,
		`The leaves color were quietly turning red.`,
		`Autumn was taking over, and ${pronoun} started`
	],
	seasonWinter: [
		`It was winter, and the ground was heavily covered by several layers of snow.`,
		`Many small, light little snowflakes were falling on the ground.`,
	],
	locationGeneric: [
		`The ${location} was a ${locationDetails2} place: ${locationDetails3} and ${locationDetails4}.`,
		`${toUpperCase(locationDetails1)}, ${locationDetails2}, ${locationDetails3}: the ${location} really was a ${locationDetails4} place.`,
		`A ${locationDetails1} place that this ${location}. Very ${locationDetails2} and ${locationDetails3}.`
	],
	locationHorror: [
		`Despite the appearances, the ${locationDetails1} ${location} was not as safe as it used to be. People disappeared without leaving trace. Strange noises. Slowly, rumors began to spread among the locals. What could be lurking in the shadows of this ${locationDetails3} place?`,
		`The ${location} was intriguingly silent.`,
	],
	characterization: [
		`${toUpperCase(protagonist)} was a ${protagonistDescription1} ${protagonistType}. Very ${protagonistDescription2}, ${pronoun} never missed an occasion for ${protagonistHobby}.`,
	],
	situation: [
		`${protagonistFirstName} would really have prefered to be ${protagonistHobby}. Yet he had instead to be ${before}, for his good friend ${adjuvant} wanted him to do so absolutely.`,
		`${protagonistFirstName} would have preferred to be ${protagonistHobby}, but he did rather enjoyed ${before} instead.`,
		`${protagonistFirstName} was really having fun ${before}.`,
		`${protagonistFirstName} was ${before} for the first time. It did change him from his usual activities, such as ${protagonistHobby}.`,
	],
	triggerEventAction: [
		`Absorbed in his activities, ${protagonistFirstName} did not notice the person advancing swiftly behind him. A plank suddely cracked, and only at this moment did ${pronoun} turn back to face the ${plotActionWeapon1} in the hand of his foe.`,
		`${protagonistFirstName} suddenly noticed a peculiar object shining in the reflection of the ${randomObject("reflective")}. ${toUpperCase(pronoun)} turned back swiftly to face the ${plotActionWeapon1} in the hand of his foe.`,
	],
	antagonistIdentity: [
		`Staring at his adversary, ${protagonist} took several seconds to realize it was ${antagonist}, a ${antagonistDescription1}. Never in his entire life had ${protagonistFirstName} encountered such a ${antagonistDescription2} person. His ${antagonistDescription3}ness, and his ${antagonistDescription4}ness completely disgusted him.`,
	],
	scene: [
		`Nevertheless, it was no time for such constatations. ${protagonistFirstName} was in danger, and ${pronoun} needed to act. Quickly!`,
		`In a way, ${protagonistFirstName} was happy: it was at last time to teach a lesson to this damn ${antagonistDescription3} bastard! Yet he had to act quickly...`,
	],
	speechSlang1: [
		`\n\n- You're making a terrible mistake, said ${protagonistFirstName}.\n\n`,
		`\n\n- You can't win, buddy!, said ${protagonistFirstName}.\n\n`,
	],
	sentence4: [
		`From his pocket, ${protagonistFirstName} took out his ${plotActionWeapon2} and aimed at ${antagonist}. He was ready.`,
		`${protagonistFirstName} tried to take out his weapon, but ${antagonist}'s ${plotActionWeapon1} striked him before. He fell on the ground.`,
		`Before ${antagonist} could even realize it, ${protagonistFirstName} was on him, his ${plotActionWeapon2} drawn. He could not escape anymore.`,
	],
	sentence5: [
		`Before ${pronoun} could block it, ${antagonist} delivered him a blow, making him drop his weapon. Fortunately, there was a ${plotActionWeapon3} right next to him. He took it and charged in, full of zeal.`,
	],
	critics: [
		`An exciting novella. The character of ${protagonist} is well-built, complex, and really makes the story enjoyable.\n\n- ${randomObject("critics")}`,
		`This immersive and deep story really denotes a high degree of personal investment from ${authorName}. His best book yet!\n\n- ${randomObject("critics")}`,
		`Scattered with many hilarious references, ${authorName} succeeds with brio to make us enjoy the adventures of ${protagonist} against the malevolent ${antagonist}. A must-read!\n\n- ${randomObject("critics")}`
	],
}

//**//RANDOM STRINGS//**//
const randomStrings = {
	reflective: [
		`mirror`,
		`mug`,
		`window`,
		`glass`,
		`plate`,
	],
	critics: [
		`The New York Times`,
		`Times Magazine`,
		`Le Devoir`,
		`Paris Match`,
		`La Presse`,
	],
}