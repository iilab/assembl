from pyramid.httpexceptions import HTTPNotFound
from pyramid.security import authenticated_userid

from cornice import Service

from . import API_DISCUSSION_PREFIX

from assembl.models import Discussion

from assembl.auth import P_READ
from assembl.auth.util import get_permissions

sources = Service(
    name='sources',
    path=API_DISCUSSION_PREFIX + '/sources/',
    description="Manipulate a discussion's sources.",
    renderer='json',
)


@sources.get(permission=P_READ)
def get_sources(request):
    discussion_id = int(request.matchdict['discussion_id'])
    discussion = Discussion.get_instance(discussion_id)
    view_def = request.GET.get('view')

    if not discussion:
        raise HTTPNotFound(
            "Discussion with id '%s' not found." % discussion_id
        )

    user_id = authenticated_userid(request)
    permissions = get_permissions(user_id, discussion_id)
    if view_def:
        res = [source.generic_json(view_def, user_id, permissions)
               for source in discussion.sources]
        return [x for x in res if x is not None]
    else:
        return [source.serializable() for source in discussion.sources]
