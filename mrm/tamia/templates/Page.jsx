import { Alpha } from 'tamia/src/components/Text';
import Block from 'tamia/src/components/Block';
import Base from './Base';

export default function({ title, content, typo, typoTitle }) {
	return (
		<Base>
            <Block class="text" bottom={2}>
                <Alpha>{typoTitle(title)}</Alpha>
                {typo(content)}
            </Block>
		</Base>
	);
}
