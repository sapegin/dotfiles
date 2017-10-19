# codercase.py
#
# 2014-08-28 by Derick Fay
#
# based almost entirely on jdc0589's CaseConversion plug-in for SublimeText:
# https://github.com/jdc0589/CaseConversion/blob/master/case_conversion.py
#
# built with deanishe's Alfred Workflow library:
# http://www.deanishe.net/alfred-workflow/index.html
#

import sys
import re
from workflow import Workflow

### following from jdc0589

def to_snake_case(text):
    text = re.sub('[-. _]+', '_', text)
    if text.isupper():
        # Entirely uppercase; assume case is insignificant.
        return text.lower()
    return re.sub('(?<=[^_])([A-Z])', r'_\1', text).lower()

def to_snake_case_graceful(text):
    text = re.sub('[-. _]+', '_', text)
    if text.isupper():
        # Entirely uppercase; assume case is insignificant.
        return text;
    return re.sub('(?<=[^_])([A-Z])', r'_\1', text)

def strip_wrapping_underscores(text):
    return re.sub("^(_*)(.*?)(_*)$", r'\2', text)


def to_pascal_case(text):
    callback = lambda pat: pat.group(1).upper()
    text = re.sub("_(\w)", callback, text)
    if text[0].islower():
        text = text[0].upper() + text[1:]
    return text


def to_camel_case(text):
    text = to_pascal_case(text)
    return text[0].lower() + text[1:]


def to_dot_case(text):
    return text.replace("_", ".")


def to_dash_case(text):
    return text.replace("_", "-")


def to_slash(text):
    return text.replace("_", "/")

def to_docker_case(text):
    return text.replace("/", "_").lower()

def to_npm_case(text):
    return "0.0.0-" + text.replace("/", "_").replace("_", "-").lower()

def to_separate_words(text):
    return text.replace("_", " ")

def toggle_case(word):
    pascalcase = re.search('^[A-Z][a-z]+(?:[A-Z][a-z]+)*$', word)
    snakecase = re.search('^[a-z]+(?:_[a-z]+)*$', word)
    camelcase = re.search('^[a-z]+(?:[A-Z][a-z]+)*$', word)
    if (pascalcase):
        return to_snake_case(word)
    elif (snakecase):
        return to_camel_case(word)
    elif (camelcase):
        return to_pascal_case(word)
    else:
        return word
        
### end code from jdc0589

def to_cap_snake_case(text):
    text = re.sub('[-. _]+', '_', text)
    callback = lambda pat: pat.group(1).upper()
    text = re.sub("_(\w)", callback, text)
    if text[0].islower():
        text = text[0].upper() + text[1:]
    return re.sub('(?<=[^_])([A-Z])', r'_\1', text)    
    
def main(wf):
     theString = wf.args[0]

     # Add items to Alfred feedback with uids so Alfred will track frequency of use
     result = to_snake_case(theString)
     wf.add_item(title=result, subtitle='Snake Case', valid=True, arg=result, icon='snake.png',uid='snakecase')
     
     result = to_docker_case(theString)
     wf.add_item(title=result, subtitle='Docker Case', valid=True, arg=result, icon='docker.png',uid='dockercase')
     
     result = to_npm_case(theString)
     wf.add_item(title=result, subtitle='NPM Case', valid=True, arg=result, icon='npm.png',uid='npmcase')
     
     result = to_pascal_case(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Pascal Case', valid=True, arg=result, icon='pascal.png',uid='pascalcase')
     
     result = to_cap_snake_case(theString)
     wf.add_item(title=result, subtitle='Cobra Case', valid=True, arg=result, icon='cobra.png',uid='cobracase')
     
     result = to_camel_case(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Camel Case', valid=True, arg=result, icon='camel.png',uid='camelcase')
     
     result = to_dot_case(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Dot Case', valid=True, arg=result, icon='dot.png',uid='dotcase')
     
     result = to_dash_case(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Dash Case', valid=True, arg=result, icon='dash.png',uid='dashcase')
     
     result = to_slash(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Slash Case', valid=True, arg=result, icon='slash.jpg',uid='slashcase')
     
     result = to_separate_words(to_snake_case(theString))
     wf.add_item(title=result, subtitle='Separate Words', valid=True, arg=result, icon='space.png',uid='spacecase')
     
     # Send output to Alfred
     wf.send_feedback()

if __name__ == '__main__':
     wf = Workflow()
     # Assign Workflow logger to a global variable, so all module
     # functions can access it without having to pass the Workflow
     # instance around
     log = wf.logger
     sys.exit(wf.run(main))