import {
	start,
	loadConfig,
	loadSourceFiles,
	generatePages,
	savePages,
	createMarkdownRenderer,
	createTemplateRenderer,
	helpers,
} from 'fledermaus';

start('Building site...');

const config = loadConfig('config');
const options = config.base;

const renderMarkdown = createMarkdownRenderer();
const renderTemplate = createTemplateRenderer({
	root: options.templatesFolder,
});

const documents = loadSourceFiles(options.sourceFolder, options.sourceTypes, {
	renderers: {
		md: renderMarkdown,
	},
});

const pages = generatePages(documents, config, helpers, {
	jsx: renderTemplate,
});

savePages(pages, options.publicFolder);
