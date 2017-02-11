import { Alpha } from 'tamia/lib/components/Text';
import Block from 'tamia/lib/components/Block';
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
