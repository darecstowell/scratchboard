# Orders are event sourced

An order changes hands often and the audit trail is a legal requirement, so the write model is
event sourced and the read model is projected.
