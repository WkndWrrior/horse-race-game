import {
  applyAiPurchases,
  buyTradeListing,
  cancelTradeListing,
  closeTradeSession,
  createTradeSession,
  type TradeListingLike,
} from "../utils/tradeSession";

type Card = {
  value: number;
  label: string;
  suit: string;
};

type Player = {
  id: number;
  name: string;
  balance: number;
  cards: Card[];
  eliminated?: boolean;
};

const makeCard = (value: number, suit: string): Card => ({
  value,
  label: `${value}`,
  suit,
});

const makePlayer = (id: number, name: string, cards: Card[], balance = 100): Player => ({
  id,
  name,
  balance,
  cards,
  eliminated: false,
});

const makeSession = (players: Player[], listings: TradeListingLike<Card>[] = []) =>
  createTradeSession<Player, Card>(players, listings, {}, {});

describe("trade session helpers", () => {
  it("returns exactly one card when a listing is cancelled", () => {
    const cardA = makeCard(2, "♠");
    const cardB = makeCard(3, "♥");
    const seller = makePlayer(1, "You", [cardB]);
    const session = makeSession([
      seller,
      makePlayer(2, "AI", [makeCard(4, "♦")]),
    ], [
      { id: "listing-1", card: cardA, sellerId: 1 },
    ]);

    const result = cancelTradeListing(session, "listing-1");

    expect(result.session.listings).toHaveLength(0);
    expect(result.session.players[0].cards).toHaveLength(2);
    expect(result.session.players[0].cards).toEqual(
      expect.arrayContaining([cardA, cardB])
    );
  });

  it("returns only still-listed cards when the market closes", () => {
    const cardA = makeCard(2, "♠");
    const cardB = makeCard(3, "♥");
    const sellerOneCard = makeCard(5, "♣");
    const sellerTwoCard = makeCard(6, "♦");
    const sellerOne = makePlayer(1, "You", [sellerOneCard]);
    const sellerTwo = makePlayer(2, "AI", [sellerTwoCard]);
    const openSession = makeSession([sellerOne, sellerTwo], [
      { id: "listing-1", card: cardA, sellerId: 1 },
      { id: "listing-2", card: cardB, sellerId: 2 },
    ]);
    const afterCancel = cancelTradeListing(openSession, "listing-1").session;

    const result = closeTradeSession(afterCancel);

    expect(result.session.listings).toHaveLength(0);
    expect(result.session.players[0].cards).toEqual([sellerOneCard, cardA]);
    expect(result.session.players[1].cards).toEqual([sellerTwoCard, cardB]);
  });

  it("does not resurrect a sold listing after the market closes", () => {
    const cardA = makeCard(2, "♠");
    const seller = makePlayer(1, "You", []);
    const buyer = makePlayer(2, "AI", [makeCard(4, "♦")], 100);
    const session = makeSession([seller, buyer], [
      { id: "listing-1", card: cardA, sellerId: 1 },
    ]);

    const afterBuy = buyTradeListing(session, "listing-1", {
      buyerId: 2,
      listingPrice: 30,
      maxTradesPerPlayer: 2,
    }).session;
    const afterClose = closeTradeSession(afterBuy).session;

    expect(afterBuy.listings).toHaveLength(0);
    expect(afterBuy.players[1].cards).toEqual(
      expect.arrayContaining([cardA, makeCard(4, "♦")])
    );
    expect(afterClose.players[0].cards).toHaveLength(0);
    expect(afterClose.players[1].cards).toEqual(
      expect.arrayContaining([cardA, makeCard(4, "♦")])
    );
  });

  it("uses the current session for AI mutations after a user change", () => {
    const cardA = makeCard(2, "♠");
    const session = makeSession([
      makePlayer(1, "You", [makeCard(4, "♦")]),
      makePlayer(2, "AI One", [makeCard(5, "♣")], 100),
      makePlayer(3, "AI Two", [makeCard(6, "♥")], 100),
    ], [
      { id: "listing-1", card: cardA, sellerId: 2 },
    ]);
    const afterCancel = cancelTradeListing(session, "listing-1").session;

    const result = applyAiPurchases(afterCancel, {
      listingPrice: 30,
      maxTradesPerPlayer: 2,
      maxTransactions: 1,
      random: () => 0,
    });

    expect(result.changed).toBe(false);
    expect(result.session.listings).toHaveLength(0);
    expect(result.session.players[1].cards).toEqual(
      expect.arrayContaining([cardA, makeCard(5, "♣")])
    );
    expect(result.session.players[2].cards).toHaveLength(1);
  });
});
