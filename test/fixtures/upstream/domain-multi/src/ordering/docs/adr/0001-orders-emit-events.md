# Orders emit events

Billing must not read the ordering database, so an order publishes `OrderPlaced` and nothing else.
