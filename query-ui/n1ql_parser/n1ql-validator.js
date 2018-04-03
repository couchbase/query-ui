// n1ql-validator.js

var parser = require("./n1ql").parser;

function queryArray() {
    var queries = [
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON p.customerId = c.customerId OR p.customerId = \"unknown\" WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON p.customerId = c.customerId OR p.purchaseId = \"purchase8992\" WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10 OFFSET 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON p.customerId IN [ c.customerId, \"unknown\" ] WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10 OFFSET 20",
"SELECT p.productId, pu.customerId FROM product p JOIN purchase pu ON ANY pd IN pu.lineItems satisfies p.productId = pd.product END WHERE ANY r IN p.reviewList satisfies r = \"review1636\" END ORDER BY pu.customerId LIMIT 5",
"SELECT p.productId, pu.customerId, pu.purchaseId FROM product p JOIN purchase pu ON ANY pd IN pu.lineItems satisfies p.productId = pd.product END WHERE ANY r IN p.reviewList satisfies r = \"review1636\" END ORDER BY pu.customerId LIMIT 5",
"SELECT p.productId, p.color, pu.customerId FROM purchase pu JOIN product p ON p.productId IN ARRAY pd.product FOR pd IN pu.lineItems END WHERE pu.purchaseId = \"purchase1000\" ORDER BY p.productId",
"SELECT p.productId, p.color, pu.customerId FROM purchase pu UNNEST pu.lineItems as pl JOIN product p ON p.productId = pl.product WHERE pu.purchaseId = \"purchase1000\" ORDER BY p.productId",
"SELECT p.productId, pu.customerId FROM purchase pu JOIN product p ON ANY pd IN pu.lineItems satisfies pd.product = p.productId END WHERE pu.purchaseId = \"purchase1000\" ORDER BY p.productId",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM purchase p JOIN customer c ON meta(c).id = p.customerId || \"_\" || p.test_id WHERE p.purchaseId LIKE \"purchase655%\" ORDER BY p.purchaseId",
"SELECT p.productId, pu.customerId, pu.purchaseId FROM purchase pu JOIN product p ON meta(p).id IN ARRAY (pd.product || \"_ansijoin\") FOR pd IN pu.lineItems END WHERE pu.purchaseId = \"purchase1000\" ORDER BY p.productId",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON meta(c).id = p.customerId || \"_\" || p.test_id WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND p.type = \"purchase\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" AND p.type = \"purchase\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c LEFT OUTER JOIN purchase p ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM purchase p RIGHT OUTER JOIN customer c ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId = p.customerId ORDER BY p.purchaseId LIMIT 4",
"SELECT c.customerId, p.purchaseId FROM customer c JOIN purchase p ON c.customerId  || \"1\" = p.customerId ORDER BY p.purchaseId LIMIT 4",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 JOIN shellTest b2 ON b1.a11 = b2.a22 WHERE b1.type = \"left\" AND b2.type = \"right\" ORDER BY b2.c22",
"SELECT b2.c21, b2.c22, b2.a21 FROM shellTest b1 JOIN shellTest b2 ON b1.c11 = b2.c21 AND ANY v IN b2.a21 SATISFIES v = 10 END AND b2.type = \"right\" WHERE b1.type = \"left\" ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 JOIN shellTest b2 ON b2.c21 = b1.c11 AND ANY v IN b2.a21 SATISFIES v = b1.c12 END AND b2.type = \"right\" WHERE b1.type = \"left\" AND b1.c11 IS NOT MISSING ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 UNNEST b1.a11 AS ba1 JOIN shellTest b2 ON ba1 = b2.c21 AND b2.type = \"right\" WHERE b1.c11 = 2 AND b1.type = \"left\" ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 UNNEST b1.a11 AS ba1 LEFT JOIN shellTest b2 ON ba1 = b2.c21 AND b2.type = \"right\" WHERE b1.c11 = 4 AND b1.type = \"left\"",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 JOIN shellTest b2 ON b2.c21 IN b1.a11 AND b2.type = \"right\" WHERE b1.c11 = 2 AND b1.type = \"left\" ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 LEFT JOIN shellTest b2 ON b2.c21 IN b1.a11 AND b2.type = \"right\" WHERE b1.c11 = 4 AND b1.type = \"left\"",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 UNNEST b1.a11 AS ba1 JOIN shellTest b2 ON b2.c21 = b1.c11 AND ANY v IN b2.a21 SATISFIES v = ba1 END AND b2.type = \"right\" WHERE b1.type = \"left\" AND b1.c11 IS NOT MISSING ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 JOIN shellTest b2 ON b2.c21 = b1.c11 AND ANY v IN b2.a21 SATISFIES v IN b1.a11 END AND b2.type = \"right\" WHERE b1.type = \"left\" AND b1.c11 IS NOT MISSING ORDER BY b2.c22",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c USE INDEX (cust_lastName_firstName_customerId) JOIN purchase p USE INDEX (purch_customerId_purchaseId) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE INDEX (purch_customerId_purchaseId, purch_purchaseId) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE INDEX (purch_customerId_purchaseId) ON p.customerId = c.customerId OR p.customerId = \"unknown\" WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE INDEX (purch_customerId_purchaseId, purch_purchaseId) ON p.customerId = c.customerId OR p.purchaseId = \"purchase8992\" WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10 OFFSET 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c USE INDEX (cust_lastName_firstName_customerId) JOIN purchase p USE KEYS (select raw meta().id from purchase where customerId in [\"customer33\", \"customer60\", \"customer631\"]) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT pc.purchaseId, l.product, pd.name FROM purchase pc UNNEST pc.lineItems as l JOIN product pd ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT pc.purchaseId, l.product, pd.name, c.lastName, c.firstName FROM purchase pc JOIN customer c ON pc.customerId = c.customerId UNNEST pc.lineItems as l JOIN product pd ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 JOIN shellTest b2 ON b1.c11 = b2.c21 AND b1.c12 = b2.c22 AND b1.c11 < 3 AND b2.type = \"right\" WHERE b1.type = \"left\" ORDER BY b2.c22",
"SELECT b1.c11, b2.c21, b2.c22 FROM shellTest b1 LEFT JOIN shellTest b2 ON b1.c11 = b2.c21 AND b1.c12 = b2.c22 AND b1.c11 < 3 AND b2.type = \"right\" WHERE b1.type = \"left\" ORDER BY b2.c22",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c USE INDEX (cust_lastName_firstName_customerId) JOIN purchase p USE INDEX (purch_customerId_purchaseId) HASH(probe) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c USE HASH(build) JOIN purchase p USE INDEX (purch_customerId_purchaseId, purch_purchaseId) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(probe) INDEX (purch_customerId_purchaseId, purch_purchaseId) ON p.customerId = c.customerId OR p.purchaseId = \"purchase8992\" WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10 OFFSET 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c USE INDEX (cust_lastName_firstName_customerId) JOIN purchase p USE HASH(probe) KEYS (select raw meta().id from purchase where customerId in [\"customer33\", \"customer60\", \"customer631\"]) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE KEYS [\"purchase1582_hashjoin\", \"purchase1704_hashjoin\", \"purchase4534_hashjoin\", \"purchase5988_hashjoin\", \"purchase6985_hashjoin\", \"purchase7352_hashjoin\", \"purchase8538_hashjoin\", \"purchase8992_hashjoin\", \"purchase9287_hashjoin\", \"purchase104_hashjoin\", \"purchase1747_hashjoin\", \"purchase3344_hashjoin\", \"purchase3698_hashjoin\", \"purchase4142_hashjoin\", \"purchase4315_hashjoin\", \"purchase436_hashjoin\", \"purchase5193_hashjoin\", \"purchase5889_hashjoin\", \"purchase6084_hashjoin\", \"purchase8349_hashjoin\", \"purchase9300_hashjoin\", \"purchase2838_hashjoin\", \"purchase2872_hashjoin\", \"purchase4627_hashjoin\", \"purchase5610_hashjoin\", \"purchase6530_hashjoin\", \"purchase993_hashjoin\"] HASH(build) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT pc.purchaseId, l.product, pd.name FROM purchase pc UNNEST pc.lineItems as l JOIN product pd USE HASH(probe) ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT pc.purchaseId, l.product, pd.name, c.lastName, c.firstName FROM purchase pc JOIN customer c ON pc.customerId = c.customerId UNNEST pc.lineItems as l JOIN product pd USE HASH(probe) ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT pc.purchaseId, l.product, pd.name, c.lastName, c.firstName FROM purchase pc JOIN customer c USE HASH(build) ON pc.customerId = c.customerId UNNEST pc.lineItems as l JOIN product pd ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT pc.purchaseId, l.product, pd.name, c.lastName, c.firstName FROM purchase pc JOIN customer c USE HASH(probe) ON pc.customerId = c.customerId UNNEST pc.lineItems as l JOIN product pd USE HASH(build) ON l.product = pd.productId WHERE pc.purchaseId = \"purchase6558\" ORDER BY l.product",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(probe) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(build) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(build) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND p.type = \"purchase\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(probe) ON c.customerId = p.customerId WHERE c.lastName = \"Champlin\" AND c.type = \"customer\" AND p.type = \"purchase\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM purchase p JOIN customer c USE HASH(build) ON meta(c).id = p.customerId || \"_\" || p.test_id WHERE p.purchaseId LIKE \"purchase655%\" ORDER BY p.purchaseId",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c JOIN purchase p USE HASH(probe) ON meta(c).id = p.customerId || \"_\" || p.test_id WHERE c.lastName = \"Champlin\" AND p.customerId IS NOT NULL ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c LEFT OUTER JOIN purchase p USE HASH(build) ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM purchase p RIGHT OUTER JOIN customer c USE HASH(probe) ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM purchase p USE HASH(probe) RIGHT OUTER JOIN customer c ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT c.firstName, c.lastName, c.customerId, p.purchaseId FROM customer c LEFT OUTER JOIN purchase p USE HASH(probe) ON c.customerId = p.customerId WHERE c.lastName = \"Wyman\" ORDER BY p.purchaseId LIMIT 10",
"SELECT COUNT(1) as mycount FROM product p1 INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\" ",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx2) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\" ",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r > 'review8565' END OR ANY r IN p1.reviewList SATISFIES r < 'review1000' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"  ",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8566' END OR ANY r IN p1.reviewList SATISFIES r = 'review9990' AND r = 'review9991' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\" ",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ( ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8566' END AND ANY r IN p1.reviewList SATISFIES r = 'review8585' AND r = 'review8586' END) AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"  ",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx3) INNER JOIN product p2 ON KEYS (p1.productId) WHERE p1.productId IS NOT MISSING AND ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\" ",
"SELECT COUNT(1) as mycount FROM product p1 INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx2all) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidxall) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r > 'review8565' END OR ANY r IN p1.reviewList SATISFIES r < 'review1000' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidxall) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8566' END OR ANY r IN p1.reviewList SATISFIES r = 'review9990' AND r = 'review9991' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidxall) INNER JOIN product p2 ON KEYS (p1.productId) WHERE ( ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8566' END AND ANY r IN p1.reviewList SATISFIES r = 'review8585' AND r = 'review8586' END) AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
"SELECT COUNT(1) as mycount FROM product p1 USE INDEX (reviewlistidx3all) INNER JOIN product p2 ON KEYS (p1.productId) WHERE p1.productId IS NOT MISSING AND ANY r IN p1.reviewList SATISFIES r = 'review8565' AND r = 'review8565' END AND p1.test_id = \"arrayIndex\" and p2.test_id = \"arrayIndex\"",
        "SELECT d1.k0,d1.k1,d2.k3 FROM shellTest d1 JOIN shellTest d2 ON KEYS d1.k1 WHERE d1.k0=1",
        "SELECT meta(b1).id b1id, meta(b2).id b2id FROM shellTest b1 JOIN shellTest b2 ON KEY b2.docid FOR b1 WHERE meta(b1).id > ''",
"SELECT * from default:orders3 INNER JOIN default:contacts ON KEYS orders3.customers ORDER BY orders3.id, contacts.name",
"SELECT * FROM default:orders2 INNER JOIN default:contacts AS cont ON  KEYS orders2.custId ORDER BY orders2.id, cont.name",
"SELECT META(o).id oid FROM default:users_with_orders u USE KEYS \"Adaline_67672807\" INNER JOIN default:users_with_orders o ON KEYS ARRAY s.order_id FOR s IN u.shipped_order_history END ORDER BY oid",
"SELECT META(u).id uid, META(o).id oid FROM default:users_with_orders u USE KEYS \"Aide_48687583\" INNER JOIN default:users_with_orders o ON KEYS ARRAY s.order_id FOR s IN u.shipped_order_history END ORDER BY oid,uid", 
"SELECT META(o).id oid FROM default:users_with_orders u USE KEYS \"Adaline_67672807\" UNNEST u.shipped_order_history s INNER JOIN default:users_with_orders o ON KEYS s.order_id ORDER BY oid",
"SELECT o.order_details.order_id AS oid FROM default:users_with_orders u USE KEYS \"Aide_48687583\" INNER JOIN default:users_with_orders o ON KEYS ARRAY s.order_id FOR s IN u.shipped_order_history END ORDER BY oid",
"SELECT  o.order_details.order_id as oid FROM default:users_with_orders u USE KEYS \"Aide_48687583\" UNNEST u.shipped_order_history s INNER JOIN default:users_with_orders o ON KEYS s.order_id ORDER BY oid",
"SELECT META(o).id oid, META(u2).id uid, search.category cat FROM default:users_with_orders u USE KEYS \"Aide_48687583\" UNNEST u.shipped_order_history s INNER JOIN default:users_with_orders o ON KEYS s.order_id INNER JOIN default:users_with_orders u2 ON KEYS META(u).id UNNEST u.search_history search ORDER BY oid, uid",
"SELECT DISTINCT contacts.name AS customer_name, orders3.orderlines FROM default:orders3 INNER JOIN default:contacts ON KEYS orders3.customers ORDER BY customer_name,orders3.orderlines",
"SELECT * from default:orders3 LEFT JOIN default:contacts ON KEYS orders3.customers ORDER BY orders3.id, contacts.name  LIMIT 4",
"SELECT o.order_details.order_id AS oid FROM default:users_with_orders u USE KEYS \"Aide_48687583\" LEFT JOIN default:users_with_orders o ON KEYS ARRAY s.order_id FOR s IN u.shipped_order_history END ORDER BY oid",
"SELECT  o.order_details.order_id as oid FROM default:users_with_orders u USE KEYS \"Aide_48687583\" UNNEST u.shipped_order_history s LEFT JOIN default:users_with_orders o ON KEYS s.order_id ORDER BY oid",
"SELECT META(o).id oid, META(u2).id uid, search.category cat FROM default:users_with_orders u USE KEYS \"Aide_48687583\" UNNEST u.shipped_order_history s LEFT JOIN default:users_with_orders o ON KEYS s.order_id LEFT JOIN default:users_with_orders u2 ON KEYS META(u).id UNNEST u.search_history search ORDER BY oid, cat, uid",
"SELECT DISTINCT contacts.name AS customer_name, orders3.id  FROM default:orders3 LEFT JOIN default:contacts ON KEYS orders3.customers ORDER BY orders3.id,customer_name",
"SELECT META(customer).id oid1, meta(purchase).id oid2 FROM purchase USE KEYS \"purchase0_joins\" INNER JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id where purchase.test_id = \"joins\" order by oid1, oid2",
"SELECT purchase.purchaseId, META(customer).id custID, META(product).id prodID, cardio FROM purchase USE KEYS \"purchase1018_joins\" UNNEST ARRAY (pl.product || \"_\" || \"joins\") FOR pl IN purchase.lineItems END AS pID INNER JOIN product ON KEYS pID INNER JOIN customer ON KEYS (purchase.customerId || \"_\" || \"joins\") UNNEST customer.ccInfo.cardNumber AS cardio ORDER BY productId",
"SELECT pu.customerId, product.unitPrice, product.productId from purchase pu USE KEYS \"purchase1018_joins\" INNER JOIN product ON KEYS ARRAY (pl.product || \"_\" || \"joins\") FOR pl IN pu.lineItems END ORDER BY product.unitPrice DESC",
"SELECT pID, product.unitPrice from purchase pu USE KEYS \"purchase1018_joins\" UNNEST ARRAY (pl.product|| \"_\" || \"joins\") FOR pl IN pu.lineItems END AS pID INNER JOIN product ON KEYS pID ORDER BY pID",
"SELECT META(customer).id oid1, meta(purchase).id oid2 FROM purchase USE KEYS \"purchase0_joins\" LEFT JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id where purchase.test_id = \"joins\" order by oid1, oid2",
"SELECT customer.ccInfo, customer.customerId, purchase.purchaseId, purchase.lineItems from purchase INNER JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id WHERE customer.test_id = \"joins\" ORDER BY purchase.customerId,purchase.purchaseId limit 10",
"SELECT META(customer).id oid1, meta(purchase).id oid2 FROM purchase USE KEYS \"purchase0_joins\" INNER JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id where purchase.test_id = \"joins\" order by oid1, oid2",
"SELECT META(purchase).id purchase_id, META(product).id product_id FROM purchase INNER JOIN product ON KEYS ARRAY s.product || \"_\" || purchase.test_id FOR s IN purchase.lineItems END where purchase.test_id = \"joins\" ORDER BY purchase_id, product_id limit 5", 
"SELECT META(purchase).id as purchase_id, meta(product).id as product_id, product.name as name FROM purchase UNNEST purchase.lineItems line INNER JOIN product ON KEYS line.product || \"_\" || purchase.test_id where purchase.test_id = \"joins\" AND product.test_id = \"joins\" ORDER BY purchase_id, product_id, name limit 5 ",
"SELECT purchase.purchaseId, META(customer).id custID, META(product).id prodID, cardio FROM purchase USE KEYS \"purchase1018_joins\" UNNEST ARRAY (pl.product || \"_\" || \"joins\") FOR pl IN purchase.lineItems END AS pID INNER JOIN product ON KEYS pID INNER JOIN customer ON KEYS (purchase.customerId || \"_\" || \"joins\") UNNEST TO_ARRAY(customer.ccInfo.cardNumber) AS cardio ORDER BY prodID",
"SELECT pu.customerId, product.unitPrice, product.productId from purchase pu USE KEYS \"purchase1018_joins\" INNER JOIN product ON KEYS ARRAY (pl.product || \"_\" || \"joins\") FOR pl IN pu.lineItems END ORDER BY product.unitPrice DESC",
"SELECT pID, product.unitPrice from purchase pu USE KEYS \"purchase1018_joins\" UNNEST ARRAY (pl.product|| \"_\" || \"joins\") FOR pl IN pu.lineItems END AS pID INNER JOIN product ON KEYS pID ORDER BY pID",
"SELECT DISTINCT productId, pu.customerId, customer.firstName FROM purchase pu UNNEST ARRAY (pl.product|| \"_\" || \"joins\") FOR pl IN pu.lineItems END AS productId INNER JOIN customer ON KEYS (pu.customerId|| \"_\" || \"joins\") WHERE pu.customerId=\"customer498\" ORDER BY productId limit 8",
"SELECT customer.ccInfo, customer.customerId, purchase.purchaseId, purchase.lineItems from purchase LEFT JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id WHERE customer.test_id = \"joins\" ORDER BY purchase.customerId,purchase.purchaseId limit 10",
"SELECT META(customer).id oid1, meta(purchase).id oid2 FROM purchase USE KEYS \"purchase0_joins\" LEFT JOIN customer ON KEYS purchase.customerId || \"_\" || purchase.test_id where purchase.test_id = \"joins\" order by oid1, oid2",
"SELECT META(purchase).id purchase_id, META(product).id product_id FROM purchase LEFT JOIN product ON KEYS ARRAY s.product || \"_\" || purchase.test_id FOR s IN purchase.lineItems END where purchase.test_id = \"joins\" ORDER BY purchase_id, product_id limit 5", 
        "SELECT META(purchase).id as purchase_id, meta(product).id as product_id, product.name as name FROM purchase UNNEST purchase.lineItems line LEFT JOIN product ON KEYS line.product || \"_\" || purchase.test_id where purchase.test_id = \"joins\" AND product.test_id = \"joins\" ORDER BY purchase_id, product_id, name limit 5 ",
        //  "select * from foo order by boo.moo.goo",
        //"select foo from loo",
        //"(distinct (array (`r`.`flight`) for `r` in `schedule` end))"
        //"select first e.`desc` for e in props.bom_concrete_type when e.id = \"1\" end as `desc` from default;"
        //"any foo in reviews satisfies foo.ratings.Overall = 5 end"
        //"array {\"content\": review.content, \"ratings\" : review.ratings} for review in reviews when every bar within review.ratings satisfies bar = 1 end end"
        //"first item.content for item in bar end"
        //"select q.type from `beer-sample` q;"
        "blah blah blah blah"
        //"select foo.moo.goo[a.b.c].boo from loo",
        //"foo < bar",
        //"foo < bar; foo > bar;"
        //"update beer set type = 'foo' where othertype = 'bar'",
        //"select foo.bar.boo[z.y.x].moo from foo where a.b.c.d > 0",
        //"distinct array i for i in address when i < 10  END"
        //"create index idx6 on `beer-sample`(distinct array i for i in address END);"
        // "select select from from"
    ];


    for (var i=0; i< queries.length; i++) {
        var query = queries[i];
        try {
           // console.log("\n\nParsing: \n\n" + query + "\n");
            var result = parser.parse(query);
           // console.log("\nresult is: \n\n" + JSON.stringify(result,null,2));
        }
        catch (err) {
            console.log("\n\nParse error for \n\n" + query + "\n\nis: " + err.message);
        }
    }
}

function queryFile() {
    var lineReader = require('readline').createInterface({
        //    input: require('fs').createReadStream('/Users/eben/src/jison/examples/query.txt')
        input: require('fs').createReadStream('/Users/eben/src/jison/examples/queries.txt')
    });

    var lineNum = 0;
    lineReader.on('line', function (line) {

        try {
            var result = parser.parse(line);
            console.log("Parsed line " + ++lineNum + " ok.");
            //if (result && result[0])
            //  console.log("paths used: \n\n" + JSON.stringify(result[0].pathsUsed,null,2));
        }
        catch (err) {
            console.log("\n\nParse error for \n\n" + line + "\n\nis: " + err.message);
        }
    });
}


//queryFile();
queryArray();
