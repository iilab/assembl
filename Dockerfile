#
#
#

FROM    ubuntu:14.10

ENV     DEBIAN_FRONTEND noninteractive

RUN     apt-get update && apt-get install -y \
            fabric \
            git \
            openssh-server \
            libvirtodbc0 \
            pandoc \
            ruby-dev
# TODO: pandoc and ruby-dev are both missing from fabfile.py

# Setup passwordless ssh
RUN     ssh-keygen -t dsa -P '' -f ~/.ssh/id_dsa && \
            cat ~/.ssh/id_dsa.pub >> ~/.ssh/authorized_keys

# Install package dependencies
ADD     fabfile.py /code/fabfile.py
ADD     dockerfiles/webapp/local.ini /code/local.ini
ADD     requirements.txt /code/requirements.txt
ADD     Gemfile /code/Gemfile
ADD     bower.json /code/bower.json
ADD     .bowerrc /code/.bowerrc
ADD     assembl/static/widget/card/bower.json /code/assembl/static/widget/card/bower.json
ADD     assembl/static/widget/session/bower.json /code/assembl/static/widget/session/bower.json
ADD     assembl/static/widget/video/bower.json /code/assembl/static/widget/video/bower.json
ADD     assembl/static/widget/vote/bower.json /code/assembl/static/widget/vote/bower.json
ADD     assembl/static/widget/creativity/bower.json /code/assembl/static/widget/creativity/bower.json
WORKDIR /code
# TODO: this is a workaround for rbenv failing with:
# run: bundle install --path=vendor/bundle
# out: rbenv: version `system' is not installed
# I suspect this needs to be checked into git
RUN     echo "2.0.0-p481" > /code/.ruby-version
RUN     /etc/init.d/ssh start && \
            ssh-keyscan localhost >> ~/.ssh/known_hosts && \
            fab devenv install_builddeps && \
            fab devenv build_virtualenv && \
            fab devenv app_update_dependencies && \
            /etc/init.d/ssh stop

# Build assets
ADD     config.rb /code/config.rb
ADD     assembl/static/ /code/assembl/static/
RUN     /etc/init.d/ssh start && \
            fab devenv compile_stylesheets && \
            fab devenv minify_javascript_maybe && \
            /etc/init.d/ssh stop


ADD     dockerfiles/webapp/odbc.ini /code/odbc.ini
ADD     . /code
RUN     /etc/init.d/ssh start && \
            fab devenv compile_messages && \
            venv/bin/pip install -e . && \
            /etc/init.d/ssh stop

# TODO: use uwsgi?
CMD     venv/bin/pserve --reload local.ini
EXPOSE  6543
