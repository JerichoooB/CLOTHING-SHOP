export const categories = ["Men", "Women", "Unisex", "Accessories"];
export const pages = [
  "Home",
  "Shop",
  "Saved",
  "ResetPassword",
  ...categories,
  "About",
  "Contact",
  "Checkout",
  "Orders",
  "Admin",
];
export const editorial = {
  Home: 0,
  Men: 1,
  Women: 2,
  Unisex: 3,
  Accessories: 4,
  Shop: 1,
  Story: 5,
};
export const money = (value) => "₱ " + value.toLocaleString("en-PH");
