#
#
#

FROM    ubuntu:14.10

ENV     DEBIAN_FRONTEND noninteractive

RUN     apt-get update && apt-get install -y \
            fabric \
            git \
            openssh-server

# Setup passwordless ssh
RUN     ssh-keygen -t dsa -P '' -f ~/.ssh/id_dsa && \
            cat ~/.ssh/id_dsa.pub >> ~/.ssh/authorized_keys

# TODO: missing from fabfile.py
RUN     apt-get update && apt-get install -y pandoc ruby-dev


# Install package dependencies
ADD     fabfile.py /code/fabfile.py
ADD     development-docker.ini /code/development-docker.ini
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
RUN     mv development-docker.ini local.ini
RUN     /etc/init.d/ssh start && \
            ssh-keyscan localhost >> ~/.ssh/known_hosts && \
            fab devenv install_builddeps && \
            fab devenv build_virtualenv && \
            /etc/init.d/ssh stop

# TODO: move this to the top
#RUN     adduser assembl
#RUN     chown -R assembl:assembl /code
#RUN     mkdir /home/assembl/.ssh/ && \
#            cp ~/.ssh/id_dsa* /home/assembl/.ssh/ && \
#            chown -R assembl:assembl /home/assembl/.ssh/

# TODO: merge this step back into above after debugging
RUN     /etc/init.d/ssh start && \
            fab devenv app_update_dependencies && \
            /etc/init.d/ssh stop

# Build assets
ADD     config.rb /code/config.rb
ADD     assembl/static/ /code/assembl/static/
RUN     /etc/init.d/ssh start && \
            fab devenv compile_stylesheets && \
            fab devenv minify_javascript_maybe && \
            /etc/init.d/ssh stop

# TODO: a bunch of this is similar to `app_setup`, which is not exposed as a 
# task
# Add the application code
ADD     . /code
RUN     /etc/init.d/ssh start && \
            fab devenv compile_messages && \
            venv/bin/pip install -e . && \
            venv/bin/assembl-ini-files local.ini && \
            /etc/init.d/ssh stop

CMD     supervisorctl start dev:
EXPOSE  6543
