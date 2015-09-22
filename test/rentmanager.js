'use strict';

var assert = require('assert'),
    moment = require('moment'),
    manager = require('../server/managers/rentmanager');

describe('rentmanager', function() {
    describe('Compute one rent price', function() {
        var properties = [
            {
                property: { price: 100, expense: 10 }
            },
            {
                property: { price: 50 }
            }
        ];

        it('Assert rent price', function(){
            var price = manager._computeRent(1, 2000, properties);
            assert.equal(150, price.amount);
            assert.equal(10, price.expense);
        });
    });

    describe('Create rents between two dates', function() {
        var o = {
            discount: 0,
            isVat: true,
            vatRatio: 0.2,
            properties: [
                {
                    property: { price: 100, expense: 10 }
                },
                {
                    property: { price: 50 }
                }
            ]
        };
        var begin = moment('01/01/2000', 'DD/MM/YYYY');
        var rentMoment = moment('01/01/2000', 'DD/MM/YYYY');
        var contractDuration = moment.duration(9, 'years');
        var end = moment(begin).add(contractDuration).subtract(1, 'days');
        var previousRent;
        var testVatAmount = (o.properties[0].property.price + o.properties[0].property.expense + o.properties[1].property.price)*o.vatRatio;
        var testRentAmount = (o.properties[0].property.price + o.properties[0].property.expense + o.properties[1].property.price) + testVatAmount;

        while (rentMoment.isBefore(end) || rentMoment.isSame(end)) {
            previousRent = manager.createRent(rentMoment, end, previousRent, o);
            rentMoment.add(1, 'months');
        };

        it('Assert number of years and months are correct', function(){
            var year, month;
            var countYear = 0;
            var countMonth;

            assert.notEqual(undefined, o.rents);
            for (year in o.rents) {
                countYear++;
                assert.equal(true, Number(year)<2009);
                assert.equal(true, Number(year)>1999);
                countMonth = 0;
                for (month in o.rents[year]) {
                    countMonth++;
                    assert.equal(true, Number(month)<13);
                    assert.equal(true, Number(month)>0);
                }
                assert.equal(12, countMonth);
            }
            assert.equal(9, countYear);
        });

        it('Assert amounts are correct', function(){
            var year, month;
            var countRent = 0;

            for (year in o.rents) {
                for (month in o.rents[year]) {
                    countRent++;
                    assert.strictEqual(Number(year), o.rents[year][month].year);
                    assert.strictEqual(Number(month), o.rents[year][month].month);
                    assert.strictEqual(o.discount, o.rents[year][month].discount);
                    assert.strictEqual(o.isVat, o.rents[year][month].isVat);
                    assert.strictEqual(o.vatRatio, o.rents[year][month].vatRatio);
                    assert.strictEqual(testRentAmount*(countRent-1), o.rents[year][month].balance);
                    assert.strictEqual(testVatAmount, o.rents[year][month].vatAmount);
                    assert.strictEqual(testRentAmount*countRent, o.rents[year][month].totalAmount);
                }
            }
        });

        it('Make a payment', function(){
            var year, month;
            var countRent = 0;
            var previousRent;
            var rent = {
                payment: 48*testRentAmount,
                paymentType: 'cash',
                paymentReference: '211221',
                paymentDate: '01/01/2004',
                description: 'no description'
            };
            var isPayment = false;

            rentMoment = moment('01/01/2004', 'DD/MM/YYYY');
            do {
                previousRent = manager._updateRentPayment(rentMoment, previousRent, o, rent);
                rentMoment.add(1, 'months');
            } while (previousRent);

            for (year in o.rents) {
                if (Number(year)===2004) {
                    countRent = 0;
                    isPayment = true;
                }
                for (month in o.rents[year]) {
                    countRent++;
                    assert.strictEqual(Number(year), o.rents[year][month].year);
                    assert.strictEqual(Number(month), o.rents[year][month].month);
                    assert.strictEqual(o.discount, o.rents[year][month].discount);
                    assert.strictEqual(o.isVat, o.rents[year][month].isVat);
                    assert.strictEqual(o.vatRatio, o.rents[year][month].vatRatio);
                    if (isPayment) {
                        isPayment = false;
                        assert.strictEqual(testRentAmount*(48), o.rents[year][month].balance);
                        assert.strictEqual(testRentAmount*(48+1), o.rents[year][month].totalAmount);
                    }
                    else {
                        assert.strictEqual(testRentAmount*(countRent-1), o.rents[year][month].balance);
                        assert.strictEqual(testRentAmount*countRent, o.rents[year][month].totalAmount);
                    }
                    assert.strictEqual(testVatAmount, o.rents[year][month].vatAmount);
                }
            }
        });

        it('Modify contract duration', function() {
            var duration = moment.duration(1, 'years');
            var momentEnd = moment(end).add(duration);
            var year, month;
            var countYear = 0;
            var countMonth;

            previousRent = null;
            rentMoment = moment('01/01/2000', 'DD/MM/YYYY');
            do {
                previousRent = manager.updateRentAmount(rentMoment, momentEnd, previousRent, o);
                rentMoment.add(1, 'months');
            } while (previousRent);

            assert.notEqual(undefined, o.rents);
            for (year in o.rents) {
                countYear++;
                assert.equal(true, Number(year)<2010);
                assert.equal(true, Number(year)>1999);
                countMonth = 0;
                for (month in o.rents[year]) {
                    countMonth++;
                    assert.equal(true, Number(month)<13);
                    assert.equal(true, Number(month)>0);
                }
                assert.equal(12, countMonth);
            }
            assert.equal(10, countYear);

            countYear = 0;
            momentEnd = moment(momentEnd).subtract(duration);
            previousRent = null;
            rentMoment = moment('01/01/2000', 'DD/MM/YYYY');
            do {
                previousRent = manager.updateRentAmount(rentMoment, momentEnd, previousRent, o);
                rentMoment.add(1, 'months');
            } while (previousRent)

            assert.notEqual(undefined, o.rents);
            for (year in o.rents) {
                countYear++;
                assert.equal(true, Number(year)<2009);
                assert.equal(true, Number(year)>1999);
                countMonth = 0;
                for (month in o.rents[year]) {
                    countMonth++;
                    assert.equal(true, Number(month)<13);
                    assert.equal(true, Number(month)>0);
                }
                assert.equal(12, countMonth);
            }
            assert.equal(9, countYear);
        });
    });
});