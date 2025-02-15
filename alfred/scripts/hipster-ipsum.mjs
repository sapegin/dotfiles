// Based on https://github.com/pbojinov/lorem-hipsum
// with some words removed, and some added

const MIN_WORDS = 10;
const MAX_WORDS = 15;

const dictionary = [
	'actually',
	'aesthetic',
	'art party',
	'artisan',
	'asymmetrical',
	'authentic',
	'banh mi',
	'banjo',
	'Banksy',
	'beard',
	'before they sold out',
	'bespoke',
	'bicycle rights',
	'biodiesel',
	'bitters',
	'blog',
	'Blue Bottle',
	'Brooklyn',
	'brunch',
	'butcher',
	'cardigan',
	'chambray',
	'chia',
	'chillwave',
	'church-key',
	'cliche',
	'cornhole',
	'Cosby sweater',
	'craft beer',
	'cray',
	'cred',
	'crucifix',
	'deep v',
	'direct trade ',
	'disrupt',
	'distillery',
	'DIY',
	'dreamcatcher',
	'drinking vinegar',
	'ennui',
	'ethical',
	'ethnic',
	'fanny pack',
	'farm-to-table',
	'fashion axe',
	'fingerstache',
	'fixie',
	'flannel',
	'flexitarian',
	'food truck',
	'forage',
	'four loko',
	'freegan',
	'gastropub',
	'gentrify',
	'gluten-free',
	'Godard',
	'hashtag',
	'hella',
	'Helvetica',
	'High Life',
	'hoodie',
	'Intelligentsia',
	'iPhone',
	'irony',
	'jean shorts',
	'kale chips',
	'keffiyeh',
	'keytar',
	'Kickstarter',
	'kitsch',
	'kogi',
	'leggings',
	'letterpress',
	'literally',
	'lo-fi',
	'locavore',
	'lomo',
	'master cleanse',
	'meggings',
	'meh',
	'messenger bag',
	'mixtape',
	'mlkshk',
	'mumblecore',
	'mustache',
	'narwhal',
	'next level',
	'normcore',
	'occupy',
	'organic',
	'paleo',
	'photo booth',
	'pickled',
	'plaid',
	'polaroid',
	'pop-up',
	'pork belly',
	'post-ironic',
	'pour-over',
	'pug',
	'put a bird on it',
	'quinoa',
	'raw denim',
	'readymade',
	'retro',
	'roof party',
	'salvia',
	'sartorial',
	'scenester',
	'Schlitz',
	'seitan',
	'selfies',
	'selvage',
	'semiotics',
	'shabby chic',
	'single-origin coffee',
	'skateboard',
	'slow-carb',
	'small batch',
	'squid',
	'sriracha',
	'street art',
	'stumptown',
	'sustainable',
	'swag',
	'synth',
	'tattooed',
	'tofu',
	'tote bag',
	'tousled',
	'trust fund',
	'try-hard',
	'twee',
	'typewriter',
	'ugh',
	'umami',
	'vegan',
	'VHS',
	'vinyl',
	'viral',
	'wayfarers',
	'whatever',
	'wolf',
	'XOXO',
	'YOLO',
	'you probably haven’t heard of them',
	// My additions
	'X-berg',
	'Neukölln',
	'Prenzlauer Berg',
	'Mauerpark',
	'Berghain',
	'döner',
	'bagel',
	'ramen',
	'taco',
	'poke bowl',
	'pumpkin spice latte',
	'matcha',
	'flea market',
	'vintage',
	'instagrammable',
	'späti',
	'TikTok',
	'MacBook',
];

/**
 * Return non-repeating random item from an array factory
 * Source: https://stackoverflow.com/a/17891411/1973105
 */
function randomNoRepeats(array) {
	let copy = [...array];
	return () => {
		if (copy.length === 0) {
			copy = [...array];
		}
		const index = Math.floor(Math.random() * copy.length);
		const item = copy[index];
		copy.splice(index, 1);
		return item;
	};
}

const getRandomWord = randomNoRepeats(dictionary);

function getRandomInteger(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function getHipsumSentence(words) {
	const sentenceWords = [];

	let count = getRandomInteger(MIN_WORDS, MAX_WORDS);
	while (count) {
		sentenceWords.push(getRandomWord(words));
		count--;
	}

	const sentence = sentenceWords.join(' ');
	return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

// --------- 8< --------- 8< --------- 8< ---------

// Send the results to Alfred
console.log(getHipsumSentence(dictionary));
