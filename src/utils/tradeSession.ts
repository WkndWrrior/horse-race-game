export interface TradeCardLike {
  value: number;
  label: string;
  suit: string;
}

export interface TradePlayerLike<CardType extends TradeCardLike = TradeCardLike> {
  id: number;
  balance: number;
  cards: CardType[];
  eliminated?: boolean;
}

export interface TradeListingLike<CardType extends TradeCardLike = TradeCardLike> {
  id: string;
  card: CardType;
  sellerId: number;
}

export interface TradeSessionState<
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
> {
  players: PlayerType[];
  listings: TradeListingLike<CardType>[];
  buyCounts: Record<number, number>;
  sellCounts: Record<number, number>;
}

export interface TradeMutationResult<
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
> {
  session: TradeSessionState<PlayerType, CardType>;
  changed: boolean;
}

interface PurchaseOptions {
  buyerId: number;
  listingPrice: number;
  maxTradesPerPlayer: number;
}

interface AiListingOptions {
  createListingId: () => string;
  random?: () => number;
  userId?: number;
}

interface AiPurchaseOptions {
  listingPrice: number;
  maxTradesPerPlayer: number;
  maxTransactions?: number;
  random?: () => number;
  buyerId?: number;
}

const findCardIndex = <CardType extends TradeCardLike>(
  cards: CardType[],
  card: CardType
) =>
  cards.findIndex(
    (entry) => entry.value === card.value && entry.suit === card.suit
  );

const clonePlayers = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike
>(
  players: PlayerType[]
) => players.map((player) => ({ ...player, cards: [...player.cards] }));

const createSessionResult = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  changed: boolean
): TradeMutationResult<PlayerType, CardType> => ({ session, changed });

export const createTradeSession = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  players: PlayerType[],
  listings: TradeListingLike<CardType>[] = [],
  buyCounts: Record<number, number> = {},
  sellCounts: Record<number, number> = {}
): TradeSessionState<PlayerType, CardType> => ({
  players,
  listings,
  buyCounts,
  sellCounts,
});

export const appendTradeListing = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  sellerId: number,
  card: CardType,
  listingId: string
): TradeMutationResult<PlayerType, CardType> => {
  const seller = session.players.find((player) => player.id === sellerId);
  if (!seller || seller.eliminated) {
    return createSessionResult(session, false);
  }

  const cardIndex = findCardIndex(seller.cards, card);
  if (cardIndex < 0) {
    return createSessionResult(session, false);
  }

  const players = clonePlayers(session.players);
  const nextSeller = players.find((player) => player.id === sellerId);
  if (!nextSeller) {
    return createSessionResult(session, false);
  }

  nextSeller.cards.splice(cardIndex, 1);

  return createSessionResult(
    {
      ...session,
      players,
      listings: [
        ...session.listings,
        {
          id: listingId,
          card,
          sellerId,
        },
      ],
    },
    true
  );
};

export const cancelTradeListing = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  listingId: string
): TradeMutationResult<PlayerType, CardType> => {
  const listing = session.listings.find((entry) => entry.id === listingId);
  if (!listing) {
    return createSessionResult(session, false);
  }

  const players = clonePlayers(session.players);
  const seller = players.find((player) => player.id === listing.sellerId);
  if (!seller) {
    return createSessionResult(session, false);
  }

  seller.cards.push(listing.card);

  return createSessionResult(
    {
      ...session,
      players,
      listings: session.listings.filter((entry) => entry.id !== listingId),
    },
    true
  );
};

export const buyTradeListing = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  listingId: string,
  options: PurchaseOptions
): TradeMutationResult<PlayerType, CardType> => {
  const listing = session.listings.find((entry) => entry.id === listingId);
  if (!listing || listing.sellerId === options.buyerId) {
    return createSessionResult(session, false);
  }

  const buyer = session.players.find((player) => player.id === options.buyerId);
  const seller = session.players.find((player) => player.id === listing.sellerId);
  if (
    !buyer ||
    !seller ||
    buyer.eliminated ||
    seller.eliminated ||
    buyer.balance < options.listingPrice
  ) {
    return createSessionResult(session, false);
  }

  const buyerPurchases = session.buyCounts[buyer.id] ?? 0;
  const sellerSold = session.sellCounts[seller.id] ?? 0;
  if (
    buyerPurchases >= options.maxTradesPerPlayer ||
    sellerSold >= options.maxTradesPerPlayer
  ) {
    return createSessionResult(session, false);
  }

  const players = clonePlayers(session.players);
  const nextBuyer = players.find((player) => player.id === buyer.id);
  const nextSeller = players.find((player) => player.id === seller.id);
  if (!nextBuyer || !nextSeller) {
    return createSessionResult(session, false);
  }

  nextBuyer.balance -= options.listingPrice;
  nextBuyer.cards.push(listing.card);
  nextSeller.balance += options.listingPrice;

  return createSessionResult(
    {
      ...session,
      players,
      listings: session.listings.filter((entry) => entry.id !== listingId),
      buyCounts: {
        ...session.buyCounts,
        [buyer.id]: buyerPurchases + 1,
      },
      sellCounts: {
        ...session.sellCounts,
        [seller.id]: sellerSold + 1,
      },
    },
    true
  );
};

export const closeTradeSession = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>
): TradeMutationResult<PlayerType, CardType> => {
  if (session.listings.length === 0 && Object.keys(session.buyCounts).length === 0) {
    return createSessionResult(session, false);
  }

  const players = clonePlayers(session.players);
  for (const listing of session.listings) {
    const seller = players.find((player) => player.id === listing.sellerId);
    if (!seller) {
      continue;
    }

    seller.cards.push(listing.card);
  }

  return createSessionResult(
    {
      ...session,
      players,
      listings: [],
      buyCounts: {},
      sellCounts: {},
    },
    true
  );
};

export const createAiListings = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  options: AiListingOptions
): TradeMutationResult<PlayerType, CardType> => {
  const random = options.random ?? Math.random;
  const userId = options.userId ?? 1;
  const players = clonePlayers(session.players);
  const listings = [...session.listings];
  let changed = false;

  for (const player of players) {
    if (player.eliminated || player.id === userId || player.cards.length <= 1) {
      continue;
    }

    const nextCards = [...player.cards];
    const wantsTwo = nextCards.length > 1 && random() < 0.35;
    const maxListings = Math.max(nextCards.length - 1, 0);
    const listCount = Math.min(wantsTwo ? 2 : 1, maxListings);

    for (let i = 0; i < listCount; i += 1) {
      const cardIndex = Math.floor(random() * nextCards.length);
      const [card] = nextCards.splice(cardIndex, 1);
      listings.push({
        id: options.createListingId(),
        card,
        sellerId: player.id,
      });
      changed = true;
    }

    player.cards = nextCards;
  }

  return createSessionResult(
    {
      ...session,
      players,
      listings,
    },
    changed
  );
};

export const applyAiPurchases = <
  PlayerType extends TradePlayerLike<CardType>,
  CardType extends TradeCardLike = TradeCardLike
>(
  session: TradeSessionState<PlayerType, CardType>,
  options: AiPurchaseOptions
): TradeMutationResult<PlayerType, CardType> => {
  const random = options.random ?? Math.random;
  const buyerId = options.buyerId ?? 1;
  const players = clonePlayers(session.players);
  let listings = [...session.listings];
  const nextBuyCounts = { ...session.buyCounts };
  const nextSellCounts = { ...session.sellCounts };
  let changed = false;
  let transactions = 0;

  const eliminatedIds = new Set(
    players.filter((player) => player.eliminated).map((player) => player.id)
  );

  for (const player of players) {
    if (transactions >= (options.maxTransactions ?? Number.POSITIVE_INFINITY)) {
      break;
    }

    if (player.eliminated || player.id === buyerId || player.balance < options.listingPrice) {
      continue;
    }

    let purchases = 0;
    const availableBuys =
      options.maxTradesPerPlayer - (nextBuyCounts[player.id] ?? 0);

    while (purchases < availableBuys && player.balance >= options.listingPrice) {
      if (transactions >= (options.maxTransactions ?? Number.POSITIVE_INFINITY)) {
        break;
      }

      if (random() > 0.35) {
        break;
      }

      const eligibleListings = listings.filter((listing) => {
        if (listing.sellerId === player.id) {
          return false;
        }

        if (eliminatedIds.has(listing.sellerId)) {
          return false;
        }

        const sellerSold = nextSellCounts[listing.sellerId] ?? 0;
        return sellerSold < options.maxTradesPerPlayer;
      });

      if (eligibleListings.length === 0) {
        break;
      }

      const listing = eligibleListings[Math.floor(random() * eligibleListings.length)];
      const seller = players.find((entry) => entry.id === listing.sellerId);
      if (!seller) {
        listings = listings.filter((entry) => entry.id !== listing.id);
        continue;
      }

      player.balance -= options.listingPrice;
      player.cards.push(listing.card);
      seller.balance += options.listingPrice;
      nextBuyCounts[player.id] = (nextBuyCounts[player.id] ?? 0) + 1;
      nextSellCounts[listing.sellerId] = (nextSellCounts[listing.sellerId] ?? 0) + 1;
      listings = listings.filter((entry) => entry.id !== listing.id);
      purchases += 1;
      transactions += 1;
      changed = true;
    }
  }

  if (!changed) {
    return createSessionResult(session, false);
  }

  return createSessionResult(
    {
      ...session,
      players,
      listings,
      buyCounts: nextBuyCounts,
      sellCounts: nextSellCounts,
    },
    true
  );
};
